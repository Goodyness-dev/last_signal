// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
interface IBurnableToken is IERC20 { function burn(uint256 amount) external; }
/// @notice Server trusted accounting only. Does not verify combat or tactical truth.
/// No owner, upgrade, signer rotation, emergency withdrawal or token recovery function.
contract MatchEscrow is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 public constant DEPOSIT = 100 ether;
    uint256 public constant FUNDING_WINDOW = 10 minutes;
    uint256 public constant REFUND_WINDOW = 20 minutes;
    IERC20 public immutable token;
    address public immutable settlementSigner;
    enum Outcome { A_WIN, B_WIN, DRAW, ABORT }
    struct Offer {
        bytes32 matchId;
        address playerA;
        address playerB;
        bytes32 rulesHash;
        uint256 deposit;
        uint256 createdAt;
        uint256 fundingExpiry;
        uint256 nonce;
    }
    struct Result {
        bytes32 matchId;
        address playerA;
        address playerB;
        bytes32 rulesHash;
        uint256 spendA;
        uint256 spendB;
        Outcome outcome;
        uint256 terminalTick;
        bytes32 resultHash;
        uint256 nonce;
        uint256 expiry;
    }
    struct Match {
        bytes32 offerHash;
        address playerA;
        address playerB;
        bytes32 rulesHash;
        uint256 fundingExpiry;
        uint256 refundDeadline;
        uint256 nonce;
        bool fundedA;
        bool fundedB;
        bool finalized;
    }
    bytes32 public constant OFFER_TYPEHASH = keccak256("Offer(bytes32 matchId,address playerA,address playerB,bytes32 rulesHash,uint256 deposit,uint256 createdAt,uint256 fundingExpiry,uint256 nonce)");
    bytes32 public constant RESULT_TYPEHASH = keccak256("Result(bytes32 matchId,address playerA,address playerB,bytes32 rulesHash,uint256 spendA,uint256 spendB,uint8 outcome,uint256 terminalTick,bytes32 resultHash,uint256 nonce,uint256 expiry)");
    mapping(bytes32 => Match) public matches;
    mapping(address => uint256) public claimable;
    uint256 public lockedLiability;
    uint256 public claimLiability;
    error InvalidOffer();
    error Unauthorized();
    error Closed();
    error AlreadyFunded();
    error InvalidResult();
    error Expired();
    error UnexpectedTokenAmount();
    error NothingToClaim();
    event Funded(bytes32 indexed matchId, address indexed participant, uint256 amount, uint256 refundDeadline);
    event Settled(bytes32 indexed matchId, Outcome outcome, uint256 spendA, uint256 spendB, uint256 burnAmount, uint256 creditA, uint256 creditB, bytes32 resultHash);
    event Refunded(bytes32 indexed matchId, uint256 creditA, uint256 creditB);
    event Claimed(address indexed participant, uint256 amount);
    constructor(address token_, address signer_) EIP712("LAST SIGNAL MatchEscrow", "1") {
        if (token_.code.length == 0 || signer_ == address(0)) revert InvalidOffer();
        token = IERC20(token_); settlementSigner = signer_;
    }
    function offerDigest(Offer calldata o) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(OFFER_TYPEHASH,o.matchId,o.playerA,o.playerB,o.rulesHash,o.deposit,o.createdAt,o.fundingExpiry,o.nonce)));
    }
    function resultDigest(Result calldata r) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(RESULT_TYPEHASH,r.matchId,r.playerA,r.playerB,r.rulesHash,r.spendA,r.spendB,r.outcome,r.terminalTick,r.resultHash,r.nonce,r.expiry)));
    }
    function fundMatch(Offer calldata o, bytes calldata signature) external nonReentrant {
        if (o.matchId == bytes32(0) || o.rulesHash == bytes32(0) || o.playerA == address(0) || uint160(o.playerA) >= uint160(o.playerB) || o.deposit != DEPOSIT || o.createdAt > block.timestamp || o.fundingExpiry != o.createdAt + FUNDING_WINDOW) revert InvalidOffer();
        if (block.timestamp >= o.fundingExpiry) revert Expired();
        if (msg.sender != o.playerA && msg.sender != o.playerB) revert Unauthorized();
        bytes32 digest = offerDigest(o);
        if (ECDSA.recover(digest, signature) != settlementSigner) revert Unauthorized();
        Match storage m = matches[o.matchId];
        if (m.finalized) revert Closed();
        if (m.offerHash == bytes32(0)) {
            m.offerHash=digest; m.playerA=o.playerA; m.playerB=o.playerB; m.rulesHash=o.rulesHash; m.fundingExpiry=o.fundingExpiry; m.nonce=o.nonce;
        } else if (m.offerHash != digest) revert InvalidOffer();
        if (msg.sender == m.playerA) { if(m.fundedA) revert AlreadyFunded(); m.fundedA=true; }
        else { if(m.fundedB) revert AlreadyFunded(); m.fundedB=true; }
        if(m.fundedA && m.fundedB) m.refundDeadline=block.timestamp+REFUND_WINDOW;
        lockedLiability+=DEPOSIT;
        uint256 beforeBalance=token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender,address(this),DEPOSIT);
        if(token.balanceOf(address(this)) != beforeBalance+DEPOSIT) revert UnexpectedTokenAmount();
        emit Funded(o.matchId,msg.sender,DEPOSIT,m.refundDeadline);
    }
    function settle(Result calldata r, bytes calldata signature) external nonReentrant {
        Match storage m=matches[r.matchId];
        if(m.finalized) revert Closed();
        if(!m.fundedA || !m.fundedB || r.playerA!=m.playerA || r.playerB!=m.playerB || r.rulesHash!=m.rulesHash || r.nonce!=m.nonce || r.spendA>DEPOSIT || r.spendB>DEPOSIT || r.resultHash==bytes32(0)) revert InvalidResult();
        if(msg.sender!=m.playerA && msg.sender!=m.playerB) revert Unauthorized();
        if(block.timestamp>=m.refundDeadline || block.timestamp>=r.expiry || r.expiry>m.refundDeadline) revert Expired();
        if(ECDSA.recover(resultDigest(r),signature)!=settlementSigner) revert Unauthorized();
        uint256 a; uint256 b; uint256 burnAmount;
        if(r.outcome==Outcome.ABORT){
            if(r.spendA!=0 || r.spendB!=0) revert InvalidResult();
            a=DEPOSIT;b=DEPOSIT;
        } else {
            uint256 pool=r.spendA+r.spendB;
            burnAmount=pool/10;
            uint256 distributable=pool-burnAmount;
            a=DEPOSIT-r.spendA;b=DEPOSIT-r.spendB;
            if(r.outcome==Outcome.A_WIN) a+=distributable;
            else if(r.outcome==Outcome.B_WIN) b+=distributable;
            else { a+=(distributable+1)/2;b+=distributable/2; }
        }
        m.finalized=true; lockedLiability-=2*DEPOSIT;
        claimable[m.playerA]+=a;claimable[m.playerB]+=b;claimLiability+=a+b;
        if(burnAmount!=0){
            uint256 supply=token.totalSupply(); uint256 balance=token.balanceOf(address(this));
            IBurnableToken(address(token)).burn(burnAmount);
            if(token.totalSupply()!=supply-burnAmount || token.balanceOf(address(this))!=balance-burnAmount) revert UnexpectedTokenAmount();
        }
        emit Settled(r.matchId,r.outcome,r.spendA,r.spendB,burnAmount,a,b,r.resultHash);
    }
    function refundExpired(bytes32 matchId) external nonReentrant {
        Match storage m=matches[matchId];
        if(m.offerHash==bytes32(0) || m.finalized) revert Closed();
        if(msg.sender!=m.playerA && msg.sender!=m.playerB) revert Unauthorized();
        uint256 deadline=m.fundedA&&m.fundedB?m.refundDeadline:m.fundingExpiry;
        if(block.timestamp<deadline) revert Expired();
        m.finalized=true;
        uint256 a=m.fundedA?DEPOSIT:0; uint256 b=m.fundedB?DEPOSIT:0;
        lockedLiability-=a+b;claimLiability+=a+b;claimable[m.playerA]+=a;claimable[m.playerB]+=b;
        emit Refunded(matchId,a,b);
    }
    function claim() external nonReentrant {
        uint256 amount=claimable[msg.sender];if(amount==0) revert NothingToClaim();
        claimable[msg.sender]=0;claimLiability-=amount;
        uint256 beforeBalance=token.balanceOf(msg.sender);
        token.safeTransfer(msg.sender,amount);
        if(token.balanceOf(msg.sender)!=beforeBalance+amount) revert UnexpectedTokenAmount();
        emit Claimed(msg.sender,amount);
    }
    function liabilities() external view returns(uint256){return lockedLiability+claimLiability;}
}
