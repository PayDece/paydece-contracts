// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
 
contract RevertingReceiver {
    receive() external payable {
        revert("I do not accept ETH");
    }
} 