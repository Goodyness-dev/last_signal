// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;
interface IGunMarket {function buyListed(uint256 id,uint256 price) external;}
interface ITestCurrency {function faucet() external;function approve(address spender,uint256 amount) external returns(bool);}
contract RejectingGunBuyer {
 function fund(address token) external {ITestCurrency(token).faucet();}
 function buy(address token,address market,uint256 tokenId,uint256 price) external {ITestCurrency(token).approve(market,price);IGunMarket(market).buyListed(tokenId,price);}
}
