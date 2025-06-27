// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract FailingERC20 {
    function decimals() external pure returns (uint8) { return 18; }
    function transfer(address, uint256) external pure returns (bool) { return false; }
    function transferFrom(address, address, uint256) external pure returns (bool) { return false; }
    function approve(address, uint256) external pure returns (bool) { return true; }
} 