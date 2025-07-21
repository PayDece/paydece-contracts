// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./IERC20.sol";
import "./SafeERC20.sol";
import "./ReentrancyGuard.sol";
import "./Context.sol";
import "./Ownable.sol";

contract PaydeceEscrow is ReentrancyGuard, Ownable {
    /// @notice Time limit in seconds for users to complete the transaction
    /// @dev 0.1 is 100 because it is multiplied by a thousand => 0.1 X 1000 = 100
    uint256 public timeProcess;

    /// @notice Fixed fee for scale 1 transactions (1-50 USDT)
    /// @dev Amount in token decimals (e.g., 0.5 USDC = 5e17 if 18 decimals)
    uint256 public scale1FixedFee;
    
    /// @notice Percentage fee for scale 2 transactions (50-100 USDT)
    /// @dev 1.25% = 125 basis points
    uint16 public scale2Percent;
    
    /// @notice Percentage fee for scale 3 transactions (100-1000 USDT)
    /// @dev 1% = 100 basis points
    uint16 public scale3Percent;
    
    /// @notice Percentage fee for scale 4 transactions (1000-5000 USDT)
    /// @dev 0.75% = 75 basis points
    uint16 public scale4Percent;
    
    /// @notice Percentage fee for scale 5 transactions (5000-10000 USDT)
    /// @dev 0.5% = 50 basis points
    uint16 public scale5Percent;
    
    /// @notice Percentage fee for scale 6 transactions (10000+ USDT)
    /// @dev 0.25% = 25 basis points
    uint16 public scale6Percent;
    
    /// @notice Preferential percentage fee for verified merchants
    /// @dev 0.25% = 25 basis points
    uint16 public merchantVerifiedPercent;

    using SafeERC20 for IERC20;
    
    /// @notice Mapping of order IDs to their corresponding escrow data
    mapping(uint => Escrow) public escrows;
    
    /// @notice Mapping of whitelisted stablecoin addresses
    mapping(address => bool) private whitelistedStablesAddresses;
    
    /// @notice Mapping of accumulated fees available for withdrawal per token
    mapping(IERC20 => uint) public feesAvailable;

    /// @notice Enumeration of possible escrow statuses
    enum EscrowStatus {
        Unknown,               // 0 - Initial state
        ACTIVE,               // 1 - Active escrow
        CRYPTOS_IN_CUSTODY,   // 2 - Cryptos deposited in escrow
        FIATCOIN_TRANSFERED,  // 3 - Fiat payment confirmed by receiver
        COMPLETED,            // 4 - Escrow completed successfully
        UNKNOWN_5,            // 5 - Reserved status
        APPEAL,               // 6 - Escrow under appeal/dispute
        REFUND,               // 7 - Funds refunded to sender
        RELEASEOWNER,         // 8 - Released by owner intervention
        CANCEL_SENDER,        // 9 - Cancelled by sender
        CANCEL_RECEIVER       // 10 - Cancelled by receiver
    }

    /// @notice Structure to store appeal information
    /// @param appealSender Whether the sender has appealed
    /// @param appealReceiver Whether the receiver has appealed
    /// @param appealReasonId Reason code for the appeal
    struct Appeal {
        bool appealSender;
        bool appealReceiver;
        uint16 appealReasonId;
    }

    /// @notice Main escrow structure containing all transaction data
    /// @param sender Address of the transaction sender
    /// @param receiver Address of the transaction receiver
    /// @param value Purchase amount in wei
    /// @param receiverfee Fee amount charged to receiver
    /// @param senderfee Fee amount charged to sender
    /// @param currency ERC20 token used for the transaction
    /// @param status Current status of the escrow
    /// @param created Timestamp when the escrow was created
    /// @param isSenderMerchant Whether sender has merchant verification
    /// @param isReceiverMerchant Whether receiver has merchant verification
    struct Escrow {
        address payable sender;
        address payable receiver;
        uint256 value;
        uint256 receiverfee;
        uint256 senderfee;
        IERC20 currency;
        EscrowStatus status;
        uint256 created;
        bool isSenderMerchant;
        bool isReceiverMerchant;
    }

    /// @notice Mapping of order IDs to their appeal data
    mapping(uint => Appeal) public escrowAppeals;

    event EscrowDeposit(uint indexed orderId, Escrow escrow);
    event EscrowComplete(uint indexed orderId, Escrow escrow);
    event EscrowCancelSender(uint indexed orderId, Escrow escrow);
    event EscrowCancelReceiver(uint indexed orderId, Escrow escrow);
    event EscrowMarkAsPaid(uint indexed orderId, Escrow escrow);
    event EscrowMarkAsPaidOwner(uint indexed orderId, Escrow escrow);
    event EscrowRefundOwner(uint indexed orderId, Escrow escrow);
    event SetTimeProcessEvent(uint256 timeProcess);
    event AddStablesAddressesEvent(address addressStable);
    event DelStablesAddressesEvent(address addressStable);
    event EscrowAppealSender(uint indexed orderId, Escrow escrow);
    event EscrowAppealReceiver(uint indexed orderId, Escrow escrow);

    /**
     * @notice Modifier to restrict access to sender only
     * @param _orderId The order ID to check sender for
     */
    modifier onlySender(uint _orderId) {
        require(
            msg.sender == escrows[_orderId].sender,
            "Only Sender can call this"
        );
        _;
    }

    /**
     * @notice Modifier to restrict access to receiver only
     * @param _orderId The order ID to check receiver for
     */
    modifier onlyReceiver(uint _orderId) {
        require(
            msg.sender == escrows[_orderId].receiver,
            "Only Receiver can call this"
        );
        _;
    }

    /// @notice Contract constructor initializes default fee scales and time limits
    constructor() {
        timeProcess = 45 * 60; // 45 minutes
        // Initialize fee scale values
        scale1FixedFee = 5 * 10 ** 17; // 0.5 USDC (18 decimals)
        scale2Percent = 125; // 1.25%
        scale3Percent = 100; // 1%
        scale4Percent = 75; // 0.75%
        scale5Percent = 50; // 0.5%
        scale6Percent = 25; // 0.25%
        merchantVerifiedPercent = 25; // 0.25%
    }

    // ================== Begin External functions ==================   
    
    /**
     * @notice Sets the time limit for transaction completion
     * @param _timeProcess New time limit in seconds
     */
    function setTimeProcess(uint256 _timeProcess) external onlyOwner {
        require(_timeProcess > 0, "The timeProcess can be 0");
        timeProcess = _timeProcess;
        emit SetTimeProcessEvent(timeProcess);
    }

    /**
     * @notice Creates a new escrow transaction
     * @param orderId Unique identifier for the escrow
     * @param receiver Address that will receive the funds
     * @param value Amount to be escrowed (excluding fees)
     * @param currency ERC20 token to be used for the transaction
     * @param isSenderMerchant Whether the sender has merchant verification
     * @param isReceiverMerchant Whether the receiver has merchant verification
     */
    function createEscrow(
        uint orderId,
        address payable receiver,
        uint256 value,
        IERC20 currency,
        bool isSenderMerchant,
        bool isReceiverMerchant
    ) external {
        require(receiver != address(0), "The address receiver cannot be empty");
        require(escrows[orderId].status == EscrowStatus.Unknown,"Escrow already exists");
        require(
            whitelistedStablesAddresses[address(currency)],
            "Address Stable to be whitelisted"
        );
        require(msg.sender != receiver, "Receiver cannot be the same as sender");
        require(value > 0, "The parameter value cannot be zero");
        uint256 feeAmountSender = _calculateFee(value, currency, isSenderMerchant);
        uint256 feeAmountReceiver = _calculateFee(value, currency, isReceiverMerchant);
        
        currency.safeTransferFrom(
            msg.sender,
            address(this),
            (value + feeAmountSender)
        );
        Escrow storage e = escrows[orderId];
        e.sender = payable(msg.sender);
        e.receiver = receiver;
        e.value = value;
        e.receiverfee = feeAmountReceiver;
        e.senderfee = feeAmountSender;
        e.currency = currency;
        e.status = EscrowStatus.CRYPTOS_IN_CUSTODY;
        e.created = block.timestamp;
        e.isSenderMerchant = isSenderMerchant;
        e.isReceiverMerchant = isReceiverMerchant;
        // Store secondary fields in mappings
        escrowAppeals[orderId] = Appeal(false, false, 0);
        emit EscrowDeposit(orderId, escrows[orderId]);
    }

    /**
     * @notice Releases escrow funds by owner intervention (during appeal)
     * @param _orderId The order ID to release funds for
     */
    function releaseEscrowOwner(uint _orderId) external onlyOwner {
        require(
            escrows[_orderId].status == EscrowStatus.APPEAL,
            "Status must be APPEAL"
        );
        _releaseEscrow(_orderId,true);
    }

    /**
     * @notice Releases escrow funds to receiver (called by sender)
     * @param _orderId The order ID to release funds for
     */
    function releaseEscrow(uint _orderId) external onlySender(_orderId) {
        require(escrows[_orderId].status != EscrowStatus.APPEAL, "Status must NOT be APPEAL");
        _releaseEscrow(_orderId,false);
    }

    /**
     * @notice Refunds escrow funds to sender (owner intervention during appeal)
     * @param _orderId The order ID to refund
     */
    function refundOwner(uint _orderId) external nonReentrant onlyOwner {
        require( 
            escrows[_orderId].status == EscrowStatus.APPEAL,
            "Refund not approved"
        );
        uint256 _amountFeeSender = escrows[_orderId].senderfee;
        escrows[_orderId].status = EscrowStatus.REFUND;
        
        escrows[_orderId].currency.safeTransfer(escrows[_orderId].sender, escrows[_orderId].value + _amountFeeSender);
        emit EscrowRefundOwner(_orderId, escrows[_orderId]);
    }

    /**
     * @notice Withdraws accumulated fees for a specific currency
     * @param _currency The ERC20 token to withdraw fees for
     */
    function withdrawFees(IERC20 _currency) external onlyOwner {
        uint _amount;

        // This check also prevents underflow
        require(feesAvailable[_currency] > 0, "Amount > feesAvailable");

        _amount = feesAvailable[_currency];

        if(_amount>0){
            feesAvailable[_currency] -= _amount;
        }

        _currency.safeTransfer(owner(), _amount);
    }

    /**
     * @notice Gets the current status of an escrow
     * @param _orderId The order ID to check status for
     * @return EscrowStatus Current status of the escrow
     */
    function getState(uint _orderId) external view returns (EscrowStatus) {
        return escrows[_orderId].status;
    }

    /**
     * @notice Adds a stablecoin address to the whitelist
     * @param _addressStableToWhitelist Address of the stablecoin to whitelist
     */
    function addStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = true;

        emit AddStablesAddressesEvent(_addressStableToWhitelist);
    }

    /**
     * @notice Removes a stablecoin address from the whitelist
     * @param _addressStableToWhitelist Address of the stablecoin to remove
     */
    function delStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = false;

        emit DelStablesAddressesEvent(_addressStableToWhitelist);
    }

    /**
     * @notice Cancels escrow and refunds sender (after timeout period)
     * @param _orderId The order ID to cancel
     */
    function cancelSender(
        uint256 _orderId
    ) external nonReentrant onlySender(_orderId) {
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );
        require((block.timestamp - escrows[_orderId].created) > timeProcess, "Time is still running out.");
        escrows[_orderId].status = EscrowStatus.CANCEL_SENDER;
        uint256 _amountFeeSender = escrows[_orderId].senderfee;
        
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].sender,
            escrows[_orderId].value + _amountFeeSender
        );
        emit EscrowCancelSender(_orderId, escrows[_orderId]);
    }

    /**
     * @notice Cancels escrow and refunds sender (called by receiver)
     * @param _orderId The order ID to cancel
     */
    function cancelReceiver(
        uint256 _orderId
    ) external nonReentrant onlyReceiver(_orderId) {
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY ||
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED,
            "Status must be CRYPTOS_IN_CUSTODY or FIATCOIN_TRANSFERED"
        );
        escrows[_orderId].status = EscrowStatus.CANCEL_RECEIVER;
        uint256 _amountFeeSender = escrows[_orderId].senderfee;
        
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].sender,
            (escrows[_orderId].value + _amountFeeSender)
        );
        emit EscrowCancelReceiver(_orderId, escrows[_orderId]);
    }

    /**
     * @notice Marks the fiat payment as completed (called by receiver)
     * @param _orderId The order ID to mark as paid
     */
    function setMarkAsPaid(uint256 _orderId) external onlyReceiver(_orderId) {
        // Validate the Escrow status
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        escrows[_orderId].status = EscrowStatus.FIATCOIN_TRANSFERED;

        // emit event
        emit EscrowMarkAsPaid(_orderId, escrows[_orderId]);
    }

    /**
     * @notice Marks the fiat payment as completed (owner intervention)
     * @param _orderId The order ID to mark as paid
     */
    function setMarkAsPaidOwner(uint256 _orderId) external onlyOwner {
        // Validate the Escrow status
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        escrows[_orderId].status = EscrowStatus.FIATCOIN_TRANSFERED;

        // emit event
        emit EscrowMarkAsPaidOwner(_orderId, escrows[_orderId]);
    }

    /**
     * @notice Initiates an appeal for dispute resolution
     * @param _orderId The order ID to appeal
     * @param isSender Whether the appeal is initiated by the sender
     * @param _appealReasonId Reason code for the appeal
     */
    function appeal(uint256 _orderId, bool isSender, uint16 _appealReasonId) external {
        if (isSender) {
            require(msg.sender == escrows[_orderId].sender, "Only sender can appeal");
        } else {
            require(msg.sender == escrows[_orderId].receiver, "Only receiver can appeal");
        }
        require(
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED && escrows[_orderId].status != EscrowStatus.APPEAL,
            "Status must be FIATCOIN_TRANSFERED or APPEAL"
        );
        if (isSender) {
            escrowAppeals[_orderId].appealSender = true;        
            emit EscrowAppealSender(_orderId, escrows[_orderId]);
        } else {
            escrowAppeals[_orderId].appealReceiver = true;
            emit EscrowAppealReceiver(_orderId, escrows[_orderId]);
        }
        escrowAppeals[_orderId].appealReasonId = _appealReasonId;
        escrows[_orderId].status = EscrowStatus.APPEAL;
    }

    // ================== End External functions ==================

    // ================== Begin External functions that are pure ==================
    /**
     * @notice Gets the contract version
     * @return string Version identifier
     */
    // function version() external pure virtual returns (string memory) {
    //     return "5.0";
    // }

    // ================== End External functions that are pure ==================

    /// ================== Begin Public functions ==================

    /// ================== End Public functions ==================

    // ================== Begin Private functions ==================
    /**
     * @notice Internal function to release escrow funds to receiver
     * @param _orderId The order ID to release
     * @param isOwner Whether the release is initiated by owner
     */
    function _releaseEscrow(uint _orderId, bool isOwner) private nonReentrant {
        // Only deduct receiver fee from the receiver's amount
        uint256 _amountFeeReceiver = escrows[_orderId].receiverfee;
        uint256 _amountFeeSender = escrows[_orderId].senderfee;

        // Add both fees to available fees pool
        feesAvailable[escrows[_orderId].currency] += (_amountFeeReceiver + _amountFeeSender);

        // Mark as complete before transfer in case it fails
        if(isOwner){
            escrows[_orderId].status = EscrowStatus.RELEASEOWNER;    
        }else{
            escrows[_orderId].status = EscrowStatus.COMPLETED;
        }

        // Transfer to receiver: purchase amount minus receiver fee
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].receiver,
            escrows[_orderId].value - _amountFeeReceiver
        );

        emit EscrowComplete(_orderId, escrows[_orderId]);
    }


    /// @notice Internal function to calculate fees based on amount and merchant status
    /// @param amount Transaction amount to calculate fee for
    /// @param currency ERC20 token being used
    /// @param isMerchant Whether the user has merchant verification
    /// @return uint256 Calculated fee amount
    function _calculateFee(uint256 amount, IERC20 currency, bool isMerchant) internal view returns (uint256) {
        uint8 decimals = currency.decimals();
        uint256 usdtDecimals = 10 ** uint256(decimals);
        
        // If merchant verified, apply merchant fee (0.25%)
        if (isMerchant) {
            return (amount * 25) / 10000;
        }
        // Fee scales for regular users (continuous ranges)
        uint256 amountUsdt = amount / usdtDecimals;
        if (amountUsdt >= 1 && amountUsdt < 50) {
            // Scale 1: fixed fee
            return scale1FixedFee;
        } else if (amountUsdt >= 50 && amountUsdt < 100) {
            // Scale 2: 1.25%
            return (amount * scale2Percent) / 10000;
        } else if (amountUsdt >= 100 && amountUsdt < 1000) {
            // Scale 3: 1%
            return (amount * scale3Percent) / 10000;
        } else if (amountUsdt >= 1000 && amountUsdt < 5000) {
            // Scale 4: 0.75%
            return (amount * scale4Percent) / 10000;
        } else if (amountUsdt >= 5000 && amountUsdt < 10000) {
            // Scale 5: 0.5%
            return (amount * scale5Percent) / 10000;
        } else if (amountUsdt >= 10000) {
            // Scale 6: 0.25%
            return (amount * scale6Percent) / 10000;
        }
        // Default: 0
        return 0;
    }

    /// @notice Sets the fixed fee for scale 1 transactions (1-50 USDT)
    /// @param value New fixed fee amount in token decimals
    function setScale1FixedFee(uint256 value) external onlyOwner {
        require(value <= 5 * 10 ** 17, "Scale1FixedFee must be <= 0.5 token");
        scale1FixedFee = value;
    }
    
    /// @notice Sets the percentage fee for scale 2 transactions (50-100 USDT)
    /// @param value New percentage in basis points (e.g., 125 = 1.25%)
    function setScale2Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale2Percent must be <= 2% (200)");
        scale2Percent = value;
    }
    
    /// @notice Sets the percentage fee for scale 3 transactions (100-1000 USDT)
    /// @param value New percentage in basis points (e.g., 100 = 1%)
    function setScale3Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale3Percent must be <= 2% (200)");
        scale3Percent = value;
    }
    
    /// @notice Sets the percentage fee for scale 4 transactions (1000-5000 USDT)
    /// @param value New percentage in basis points (e.g., 75 = 0.75%)
    function setScale4Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale4Percent must be <= 2% (200)");
        scale4Percent = value;
    }
    
    /// @notice Sets the percentage fee for scale 5 transactions (5000-10000 USDT)
    /// @param value New percentage in basis points (e.g., 50 = 0.5%)
    function setScale5Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale5Percent must be <= 2% (200)");
        scale5Percent = value;
    }
    
    /// @notice Sets the percentage fee for scale 6 transactions (10000+ USDT)
    /// @param value New percentage in basis points (e.g., 25 = 0.25%)
    function setScale6Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale6Percent must be <= 2% (200)");
        scale6Percent = value;
    }

    
    /**
     * @notice Sets the preferential percentage fee for verified merchants
     * @param value New percentage in basis points (e.g., 25 = 0.25%)
     */
    function setMerchantVerifiedPercent(uint16 value) external onlyOwner {
        require(value <= 200, "MerchantVerifiedPercent must be <= 2% (200)");
        merchantVerifiedPercent = value;
    }

    /// @notice Public function to expose fee calculation for testing and frontend integration
    /// @param amount Transaction amount to calculate fee for
    /// @param currency ERC20 token being used
    /// @param isMerchant Whether the user has merchant verification
    /// @return uint256 Calculated fee amount
    function publicCalculateFee(uint256 amount, IERC20 currency, bool isMerchant) external view returns (uint256) {
        return _calculateFee(amount, currency, isMerchant);
    }

    // ================== End Private functions ==================
}