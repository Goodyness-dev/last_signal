// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
interface IBurnableGameToken { function burn(uint256 amount) external; }
/// @notice Valueless testnet gun collectibles. Explicitly trusts the immutable gameplay signer.
contract GunArmory is ERC721Enumerable, EIP712, ReentrancyGuard {
 using SafeERC20 for IERC20;
 IERC20 public immutable currency;
 address public immutable gameplaySigner;
 bytes32 public immutable rulesHash;
 uint256 public nextTokenId=1;
 struct Claim {bytes32 dropId;bytes32 runId;address recipient;uint8 kind;bytes32 rulesHash;uint256 expiry;}
 struct Listing {address seller;uint256 price;}
 mapping(uint256=>uint8) public gunKind;
 mapping(uint256=>bytes32) public provenance;
 mapping(bytes32=>bool) public claimed;
 mapping(uint256=>Listing) public listings;
 bytes32 private constant CLAIM_TYPEHASH=keccak256("Claim(bytes32 dropId,bytes32 runId,address recipient,uint8 kind,bytes32 rulesHash,uint256 expiry)");
 event GunAcquired(address indexed recipient,uint256 indexed tokenId,uint8 kind,bytes32 indexed dropId);
 event Listed(uint256 indexed tokenId,address indexed seller,uint256 price);
 event Sale(uint256 indexed tokenId,address indexed seller,address indexed buyer,uint256 price);
 event ListingCancelled(uint256 indexed tokenId);
 event SupplyPurchased(address indexed buyer,bytes32 indexed runId,uint8 supply,uint256 price);
 constructor(address token,address signer,bytes32 rules) ERC721("LAST SIGNAL Field Guns","LSGUN") EIP712("LAST SIGNAL GunArmory","1") {
  require(token.code.length>0&&signer!=address(0)&&rules!=bytes32(0),"Invalid configuration");currency=IERC20(token);gameplaySigner=signer;rulesHash=rules;
 }
 function gunPrice(uint8 kind) public pure returns(uint256){require(kind<2,"Unknown gun");return kind==0?20 ether:30 ether;}
 function supplyPrice(uint8 supply) public pure returns(uint256){require(supply<3,"Unknown supply");return supply==2?10 ether:5 ether;}
 function _spend(uint256 price) private {currency.safeTransferFrom(msg.sender,address(this),price);IBurnableGameToken(address(currency)).burn(price);}
 function _gun(address recipient,uint8 kind,bytes32 dropId) private returns(uint256 tokenId){require(kind<2,"Unknown gun");tokenId=nextTokenId++;gunKind[tokenId]=kind;provenance[tokenId]=dropId;_safeMint(recipient,tokenId);emit GunAcquired(recipient,tokenId,kind,dropId);}
 function buyGun(uint8 kind) external nonReentrant returns(uint256){_spend(gunPrice(kind));return _gun(msg.sender,kind,bytes32(0));}
 function buySupply(bytes32 runId,uint8 supply) external nonReentrant {require(runId!=bytes32(0),"Run required");uint256 price=supplyPrice(supply);_spend(price);emit SupplyPurchased(msg.sender,runId,supply,price);}
 function claimLoot(Claim[] calldata rewards,bytes[] calldata signatures) external nonReentrant {
  require(rewards.length>0&&rewards.length<=3&&rewards.length==signatures.length,"Claim batch invalid");
  for(uint256 i;i<rewards.length;i++){
   Claim calldata c=rewards[i];require(c.recipient==msg.sender&&c.dropId!=bytes32(0)&&c.runId!=bytes32(0)&&c.kind<2&&c.rulesHash==rulesHash,"Claim identity invalid");require(block.timestamp<c.expiry,"Claim expired");require(!claimed[c.dropId],"Drop already claimed");
   bytes32 digest=_hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH,c.dropId,c.runId,c.recipient,c.kind,c.rulesHash,c.expiry)));require(ECDSA.recover(digest,signatures[i])==gameplaySigner,"Invalid gameplay signature");claimed[c.dropId]=true;_gun(c.recipient,c.kind,c.dropId);
  }
 }
 function listGun(uint256 tokenId,uint256 price) external {require(ownerOf(tokenId)==msg.sender,"Owner required");require(price>0&&price<=1000 ether,"Price out of range");listings[tokenId]=Listing(msg.sender,price);emit Listed(tokenId,msg.sender,price);}
 function cancelListing(uint256 tokenId) external {require(ownerOf(tokenId)==msg.sender,"Owner required");delete listings[tokenId];emit ListingCancelled(tokenId);}
 function buyListed(uint256 tokenId,uint256 expectedPrice) external nonReentrant {
  Listing memory offer=listings[tokenId];require(offer.seller!=address(0)&&offer.seller!=msg.sender&&ownerOf(tokenId)==offer.seller,"Listing unavailable");require(offer.price==expectedPrice,"Price changed");delete listings[tokenId];currency.safeTransferFrom(msg.sender,offer.seller,offer.price);_safeTransfer(offer.seller,msg.sender,tokenId,"");emit Sale(tokenId,offer.seller,msg.sender,offer.price);
 }
 function _update(address to,uint256 tokenId,address auth) internal override returns(address from){from=super._update(to,tokenId,auth);if(from!=address(0))delete listings[tokenId];}
 function ownedPage(address account,uint256 offset,uint256 limit) external view returns(uint256[] memory ids,uint8[] memory kinds,bytes32[] memory sources){
  require(limit>0&&limit<=32,"Page limit");uint256 total=balanceOf(account);uint256 n=offset<total?(total-offset<limit?total-offset:limit):0;ids=new uint256[](n);kinds=new uint8[](n);sources=new bytes32[](n);for(uint256 i;i<n;i++){uint256 tokenId=tokenOfOwnerByIndex(account,offset+i);ids[i]=tokenId;kinds[i]=gunKind[tokenId];sources[i]=provenance[tokenId];}
 }
 function marketPage(uint256 start,uint256 limit) external view returns(uint256[] memory ids,address[] memory sellers,uint256[] memory prices,uint8[] memory kinds){
  require(start>0&&limit>0&&limit<=32,"Page limit");uint256 n=start<nextTokenId?(nextTokenId-start<limit?nextTokenId-start:limit):0;ids=new uint256[](n);sellers=new address[](n);prices=new uint256[](n);kinds=new uint8[](n);for(uint256 i;i<n;i++){uint256 tokenId=start+i;ids[i]=tokenId;sellers[i]=listings[tokenId].seller;prices[i]=listings[tokenId].price;kinds[i]=gunKind[tokenId];}
 }
 function tokenURI(uint256 tokenId) public view override returns(string memory){
  _requireOwned(tokenId);string memory serial=Strings.toString(tokenId);string memory kind=gunKind[tokenId]==0?"Service Rifle":"Field Carbine";
  string memory svg=string.concat('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"><rect width="480" height="300" fill="#172b23"/><path d="M72 170h120l45-24h160v12H240l-40 28-128 12z" fill="#b49459"/><path d="M220 142h188v7H220z" fill="#a7b7a3"/><text x="28" y="42" fill="#e7d9b5" font-family="monospace" font-size="22">LAST SIGNAL FIELD GUN</text><text x="28" y="244" fill="#e7d9b5" font-family="monospace" font-size="20">',kind,' #',serial,'</text><text x="28" y="275" fill="#9cae96" font-family="monospace" font-size="13">TESTNET COLLECTIBLE / NO MONETARY VALUE</text></svg>');
  return string.concat("data:application/json;base64,",Base64.encode(bytes(string.concat('{"name":"',kind,' #',serial,'","description":"Original LAST SIGNAL testnet gun. Not official WIF. Gameplay signer trusted. No monetary value.","image":"data:image/svg+xml;base64,',Base64.encode(bytes(svg)),'","attributes":[{"trait_type":"Origin","value":"',provenance[tokenId]==bytes32(0)?'Quartermaster':'Battlefield salvage','"}]}'))));
 }
}
