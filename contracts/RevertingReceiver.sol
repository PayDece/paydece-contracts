// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
 
contract RevertingReceiver {
    receive() external payable {
        revert("I do not accept ETH");
    }
} 