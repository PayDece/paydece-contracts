# PaydeceEscrow v5 - Documentation

## Introduction

`PaydeceEscrow` is a smart escrow contract for P2P operations with stablecoins, enabling secure fund management between a buyer and a seller, with support for verified merchants, fee scales, and an appeal system.

---

## System Roles

- **Owner:** Contract administrator, can configure parameters, add/remove verified merchants, withdraw fees, and manage appeals.
- **Sender:** User who initiates the operation and deposits the funds into escrow.
- **Receiver:** User who will receive the funds once the operation is completed.
- **Verified Merchant:** User with preferential fee conditions, validated by the owner.

---

## Structures and States

### Enum: `EscrowStatus`
| Value | Description |
|-------|-------------|
| Unknown | Initial/undefined state |
| ACTIVE | (Not used, reserved) |
| CRYPTOS_IN_CUSTODY | Funds deposited in the contract |
| FIATCOIN_TRANSFERED | Receiver marked as paid (fiat transferred) |
| COMPLETED | Funds released to the receiver |
| UNKNOWN_5 | (Reserved) |
| APPEAL | In dispute/appeal |
| REFUND | Funds returned to the sender by the owner |
| RELEASEOWNER | Funds released by the owner |
| CANCEL_SENDER | Cancelled by the sender after time expired |
| CANCEL_RECEIVER | Cancelled by the receiver under certain conditions |

### Struct: `Escrow`
- `address payable sender`
- `address payable receiver`
- `uint256 value`
- `uint256 receiverfee`
- `uint256 senderfee`
- `IERC20 currency`
- `EscrowStatus status`
- `uint256 created`
- `bool isSenderMerchant`
- `bool isReceiverMerchant`

### Struct: `Appeal`
- `bool appealSender`
- `bool appealReceiver`
- `uint16 appealReasonId`

---

## Event Table

| Event | Description |
|--------|-------------|
| EscrowDeposit | A new escrow is created |
| EscrowComplete | Funds are released to the receiver |
| EscrowCancelSender | Cancellation by the sender |
| EscrowCancelReceiver | Cancellation by the receiver |
| EscrowMarkAsPaid | The receiver marks as paid |
| EscrowMarkAsPaidOwner | The owner marks as paid |
| EscrowRefundOwner | The owner returns funds to the sender |
| SetTimeProcessEvent | Expiration time is updated |
| AddStablesAddressesEvent | A stablecoin is added to the whitelist |
| DelStablesAddressesEvent | A stablecoin is removed from the whitelist |
| EscrowAppealSender | The sender initiates an appeal |
| EscrowAppealReceiver | The receiver initiates an appeal |

---

## Public and External Methods

### Escrow Management

- **`createEscrow(uint orderId, address payable receiver, uint256 value, IERC20 currency, bool isSenderMerchant, bool isReceiverMerchant)`**
  - Creates a new escrow by depositing funds into the contract. Can only be called by the sender. The receiver cannot be the same as the sender. The token must be whitelisted. Calculates and charges the corresponding fee.
  - **Parameters:**
    - `orderId`: Unique operation identifier.
    - `receiver`: Address to receive the funds.
    - `value`: Amount to deposit.
    - `currency`: Allowed ERC20 token.
    - `isSenderMerchant`: Whether the sender is a merchant.
    - `isReceiverMerchant`: Whether the receiver is a merchant.

- **`releaseEscrow(uint _orderId)`**
  - Releases the funds to the receiver. Can only be called by the sender, and only if the state is not APPEAL. Changes the state to COMPLETED.
  - **Parameters:**
    - `_orderId`: Operation identifier.

- **`releaseEscrowOwner(uint _orderId)`**
  - The owner can release the funds in case of dispute (APPEAL state). Changes the state to RELEASEOWNER.
  - **Parameters:**
    - `_orderId`: Operation identifier.

- **`refundOwner(uint _orderId)`**
  - The owner can return the funds to the sender in case of dispute (APPEAL state). Changes the state to REFUND.
  - **Parameters:**
    - `_orderId`: Operation identifier.

- **`setMarkAsPaid(uint256 _orderId)`**
  - The receiver marks the operation as paid (fiat transferred). Changes the state to FIATCOIN_TRANSFERED.
  - **Parameters:**
    - `_orderId`: Operation identifier.

- **`setMarkAsPaidOwner(uint256 _orderId)`**
  - The owner can mark the operation as paid on behalf of the receiver. Changes the state to FIATCOIN_TRANSFERED.
  - **Parameters:**
    - `_orderId`: Operation identifier.

- **`appeal(uint256 _orderId, bool isSender, uint16 _appealReasonId)`**
  - Initiates a dispute (appeal) by the sender or receiver. Changes the state to APPEAL and records the reason.
  - **Parameters:**
    - `_orderId`: Operation identifier.
    - `isSender`: Indicates if the appeal is from the sender.
    - `_appealReasonId`: Dispute reason.

- **`cancelSender(uint256 _orderId)`**
  - Allows the sender to cancel the operation if the time has expired and the state is CRYPTOS_IN_CUSTODY. Returns the funds and the fee to the sender. Changes the state to CANCEL_SENDER.
  - **Parameters:**
    - `_orderId`: Operation identifier.

- **`cancelReceiver(uint256 _orderId)`**
  - Allows the receiver to cancel the operation under certain conditions (state CRYPTOS_IN_CUSTODY or FIATCOIN_TRANSFERED). Returns the funds and the fee to the sender. Changes the state to CANCEL_RECEIVER.
  - **Parameters:**
    - `_orderId`: Operation identifier.

### Administration and Configuration

- **`setTimeProcess(uint256 _timeProcess)`**
  - Allows the owner to set the expiration time to cancel the operation.
  - **Parameters:**
    - `_timeProcess`: Time in seconds.

- **`withdrawFees(IERC20 _currency)`**
  - Allows the owner to withdraw the accumulated fees in the contract for a specific stablecoin.
  - **Parameters:**
    - `_currency`: ERC20 token from which to withdraw the fees.

- **`addStablesAddresses(address _addressStableToWhitelist)`**
  - Allows the owner to add a stablecoin to the whitelist of allowed tokens.
  - **Parameters:**
    - `_addressStableToWhitelist`: ERC20 token address.

- **`delStablesAddresses(address _addressStableToWhitelist)`**
  - Allows the owner to remove a stablecoin from the whitelist.
  - **Parameters:**
    - `_addressStableToWhitelist`: ERC20 token address.

- **`addVerifiedMerchant(address _merchant)`**
  - Allows the owner to add a verified merchant, who will have preferential fees.
  - **Parameters:**
    - `_merchant`: Merchant address.

- **`removeVerifiedMerchant(address _merchant)`**
  - Allows the owner to remove a verified merchant.
  - **Parameters:**
    - `_merchant`: Merchant address.

- **`setScale1FixedFee(uint256 value)`**
  - Allows the owner to set the fixed fee for scale 1.
  - **Parameters:**
    - `value`: Fixed fee amount (in token decimals).

- **`setScale2Percent(uint16 value)`**
  - Allows the owner to set the percentage fee for scale 2.
  - **Parameters:**
    - `value`: Percentage (e.g., 125 = 1.25%).

- **`setScale3Percent(uint16 value)`**
  - Allows the owner to set the percentage fee for scale 3.
  - **Parameters:**
    - `value`: Percentage (e.g., 100 = 1%).

- **`setScale4Percent(uint16 value)`**
  - Allows the owner to set the percentage fee for scale 4.
  - **Parameters:**
    - `value`: Percentage (e.g., 75 = 0.75%).

- **`setScale5Percent(uint16 value)`**
  - Allows the owner to set the percentage fee for scale 5.
  - **Parameters:**
    - `value`: Percentage (e.g., 50 = 0.5%).

- **`setScale6Percent(uint16 value)`**
  - Allows the owner to set the percentage fee for scale 6.
  - **Parameters:**
    - `value`: Percentage (e.g., 25 = 0.25%).

- **`setMerchantVerifiedPercent(uint16 value)`**
  - Allows the owner to set the preferential percentage fee for verified merchants.
  - **Parameters:**
    - `value`: Percentage (e.g., 25 = 0.25%).

### Query and Utility

- **`getState(uint _orderId) returns (EscrowStatus)`**
  - Allows querying the current state of an escrow operation.
  - **Parameters:**
    - `_orderId`: Operation identifier.
  - **Returns:**
    - `EscrowStatus`: Current state of the escrow.

- **`publicCalculateFee(uint256 amount, IERC20 currency, bool isSenderMerchant, bool isReceiverMerchant, bool isMerchantVerified) returns (uint256)`**
  - Allows calculating the fee that would be applied to an operation, useful for frontends and testing.
  - **Parameters:**
    - `amount`: Operation amount.
    - `currency`: ERC20 token.
    - `isSenderMerchant`: Whether the sender is a merchant.
    - `isReceiverMerchant`: Whether the receiver is a merchant.
    - `isMerchantVerified`: Whether the user is a verified merchant.
  - **Returns:**
    - `uint256`: Calculated fee.

---

## Fee Explanation

- **Scale 1:** Amount between 1 and 50 USDT, fixed fee (`scale1FixedFee`).
- **Scale 2:** 50 to 100 USDT, percentage fee (`scale2Percent`).
- **Scale 3:** 100 to 1000 USDT, percentage fee (`scale3Percent`).
- **Scale 4:** 1000 to 5000 USDT, percentage fee (`scale4Percent`).
- **Scale 5:** 5000 to 10000 USDT, percentage fee (`scale5Percent`).
- **Scale 6:** More than 10000 USDT, percentage fee (`scale6Percent`).
- **Verified merchant:** Preferential fee (`merchantVerifiedPercent`).
- The fee is charged to both the sender and the receiver according to their merchant status.

---

## Flow Diagram (Text)

1. **Creation:**
   - The sender approves and transfers funds to the contract using `createEscrow`.
   - The escrow is set to `CRYPTOS_IN_CUSTODY` state.
2. **Fiat payment confirmation:**
   - The receiver (or the owner) marks as paid (`setMarkAsPaid` or `setMarkAsPaidOwner`), changing the state to `FIATCOIN_TRANSFERED`.
3. **Funds release:**
   - The sender releases the funds (`releaseEscrow`), changing the state to `COMPLETED`.
4. **Dispute:**
   - If there is a conflict, sender or receiver can initiate an `appeal`, changing the state to `APPEAL`.
   - The owner can resolve the dispute by releasing (`releaseEscrowOwner`) or refunding (`refundOwner`) the funds.
5. **Cancellations:**
   - The sender can cancel if the time has expired (`cancelSender`).
   - The receiver can cancel under certain conditions (`cancelReceiver`).

---

## Basic Flow Example
1. **The owner adds an allowed stablecoin:**
   ```solidity
   addStablesAddresses(USDT_ADDRESS);
   ```
2. **The user creates an escrow:**
   ```solidity
   createEscrow(orderId, receiver, value, USDT, false, false);
   ```
3. **The receiver marks as paid:**
   ```solidity
   setMarkAsPaid(orderId);
   ```
4. **The sender releases the funds:**
   ```solidity
   releaseEscrow(orderId);
   ```

---

## Dispute and Resolution Example
```solidity
// The receiver marks as paid
setMarkAsPaid(orderId);
// The sender initiates an appeal
appeal(orderId, true, 1); // 1 = dispute reason
// The owner resolves the dispute
releaseEscrowOwner(orderId); // or refundOwner(orderId)
```

---

## Warnings and Best Practices
- **Approve tokens before creating an escrow.**
- **Verify that the stablecoin is whitelisted.**
- **The owner must be a trusted entity, as they can resolve disputes and withdraw fees.**
- **Do not share private keys or interact with unverified contracts.**

---

## Glossary
- **Escrow:** Temporary custody contract for funds.
- **Sender:** User who deposits the funds.
- **Receiver:** User who receives the funds.
- **Owner:** Contract administrator.
- **Verified Merchant:** User with preferential fee conditions.
- **Appeal:** Dispute process to resolve conflicts.
- **Fee:** Commission charged for using the service.

---

## Security Notes
- Only the owner can modify critical parameters and withdraw fees.
- Verified merchants have preferential fees.
- The appeal system allows disputes to be resolved transparently.
- The contract uses `ReentrancyGuard` to prevent reentrancy attacks.
- All transfers use `SafeERC20` for greater security.

---

## Contact and Support
For questions or support, contact the Paydece team. 