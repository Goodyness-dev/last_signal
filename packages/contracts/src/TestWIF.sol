// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
/// @notice Original disposable test token. Not official WIF. No monetary value.
contract TestWIF is ERC20Burnable {
    uint256 public constant FAUCET_AMOUNT = 100 ether;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;
    mapping(address => uint256) public nextFaucetAt;
    event Faucet(address indexed recipient, uint256 amount, uint256 nextAt);
    constructor() ERC20("LAST SIGNAL Test WIF", "tWIF") {}
    function faucet() external {
        require(block.timestamp >= nextFaucetAt[msg.sender], "Faucet cooling down");
        nextFaucetAt[msg.sender] = block.timestamp + FAUCET_COOLDOWN;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Faucet(msg.sender, FAUCET_AMOUNT, nextFaucetAt[msg.sender]);
    }
}
