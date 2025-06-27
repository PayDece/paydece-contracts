// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import "./SafeERC20.sol";
import "./IERC20.sol";

contract SafeERC20Test {
    using SafeERC20 for IERC20;
    function doSafeTransfer(address token, address to, uint256 amount) external {
        IERC20(token).safeTransfer(to, amount);
    }
    function doSafeTransferFrom(address token, address from, address to, uint256 amount) external {
        IERC20(token).safeTransferFrom(from, to, amount);
    }
} 