// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {MatchEscrow} from "../src/MatchEscrow.sol";
interface ITokenReceiver {function onTokens() external;}
/// @dev Test fixture only. Never used in the deployment proof.
contract HostileToken is ERC20Burnable {
    uint256 public mode;
    bool public blockClaims;
    bool public callback;
    constructor() ERC20("Hostile test fixture", "BAD") {}
    function mint(address to,uint256 amount) external {_mint(to,amount);}
    function setMode(uint256 value) external {mode=value;}
    function setBlockClaims(bool value) external {blockClaims=value;}
    function setCallback(bool value) external {callback=value;}
    function transferFrom(address from,address to,uint256 amount) public override returns(bool){
        if(mode==2)return false;
        return super.transferFrom(from,to,mode==1?amount-1:amount);
    }
    function transfer(address to,uint256 amount) public override returns(bool){
        require(!blockClaims,"Test claim transfer blocked");
        if(callback && to.code.length>0)ITokenReceiver(to).onTokens();
        return super.transfer(to,amount);
    }
    function burn(uint256 amount) public override {if(mode!=3)super.burn(amount);}
}
contract ReentrantParticipant {
    MatchEscrow public escrow;
    HostileToken public token;
    bytes4 public reentryError;
    bool public attempted;
    constructor(MatchEscrow e,HostileToken t){escrow=e;token=t;}
    function fund(MatchEscrow.Offer calldata offer,bytes calldata signature) external {
        token.approve(address(escrow),100 ether);escrow.fundMatch(offer,signature);
    }
    function claim() external {escrow.claim();}
    function onTokens() external {
        require(msg.sender==address(token));attempted=true;
        (bool ok,bytes memory data)=address(escrow).call(abi.encodeCall(escrow.claim,()));
        require(!ok,"Reentry unexpectedly succeeded");
        reentryError=bytes4(data);
    }
}
