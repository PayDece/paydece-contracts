// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./IERC20.sol";
import "./SafeERC20.sol";
import "./ReentrancyGuard.sol";
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
        Unknown,              // 0 - Initial state
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
    /// @param receiverFee Fee amount charged to receiver
    /// @param senderFee Fee amount charged to sender
    /// @param currency ERC20 token used for the transaction
    /// @param status Current status of the escrow
    /// @param created Timestamp when the escrow was created
    /// @param isSenderMerchant Whether sender has merchant verification
    /// @param isReceiverMerchant Whether receiver has merchant verification
    /// @param escrowTimeProcess Time limit for escrow completion
    struct Escrow {
        address payable sender;
        address payable receiver;
        uint256 value;
        uint256 receiverFee;
        uint256 senderFee;
        IERC20 currency;
        EscrowStatus status;
        uint256 created;
        bool isSenderMerchant;
        bool isReceiverMerchant;
        uint256 escrowTimeProcess;
    }

    /// @notice Mapping of order IDs to their appeal data
    mapping(uint => Appeal) public escrowAppeals;

    /// @notice Emitted when a new escrow is created and funds deposited
    event EscrowDeposit(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when escrow is completed and funds released to receiver
    event EscrowComplete(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when sender cancels escrow after timeout
    event EscrowCancelSender(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when receiver cancels escrow
    event EscrowCancelReceiver(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when receiver marks escrow as paid
    event EscrowMarkAsPaid(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when owner marks escrow as paid (administrative)
    event EscrowMarkAsPaidOwner(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when owner refunds escrow to sender during appeal
    event EscrowRefundOwner(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when timeProcess is updated by owner
    event SetTimeProcessEvent(uint256 timeProcess);
    
    /// @notice Emitted when a stablecoin address is added to whitelist
    event AddStablesAddressesEvent(address addressStable);
    
    /// @notice Emitted when a stablecoin address is removed from whitelist
    event DelStablesAddressesEvent(address addressStable);
    
    /// @notice Emitted when sender initiates an appeal
    event EscrowAppealSender(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when receiver initiates an appeal
    event EscrowAppealReceiver(uint indexed orderId, Escrow escrow);
    
    /// @notice Emitted when owner withdraws accumulated fees
    event FeesWithdrawn(IERC20 indexed currency, uint256 amount, address indexed to);
    
    /// @notice Emitted when scale 1 fixed fee is updated
    event Scale1FixedFeeUpdated(uint256 oldValue, uint256 newValue);
    
    /// @notice Emitted when scale 2 percentage fee is updated
    event Scale2PercentUpdated(uint16 oldValue, uint16 newValue);
    
    /// @notice Emitted when scale 3 percentage fee is updated
    event Scale3PercentUpdated(uint16 oldValue, uint16 newValue);
    
    /// @notice Emitted when scale 4 percentage fee is updated
    event Scale4PercentUpdated(uint16 oldValue, uint16 newValue);
    
    /// @notice Emitted when scale 5 percentage fee is updated
    event Scale5PercentUpdated(uint16 oldValue, uint16 newValue);
    
    /// @notice Emitted when scale 6 percentage fee is updated
    event Scale6PercentUpdated(uint16 oldValue, uint16 newValue);
    
    /// @notice Emitted when merchant verified percentage fee is updated
    event MerchantVerifiedPercentUpdated(uint16 oldValue, uint16 newValue);

    /// @notice Modifier to restrict function access to the escrow sender only
    /// @param _orderId The unique identifier of the escrow transaction
    modifier onlySender(uint _orderId) {
        require(
            msg.sender == escrows[_orderId].sender,
            "Only Sender can call this"
        );
        _;
    }

    /// @notice Modifier to restrict function access to the escrow receiver only
    /// @param _orderId The unique identifier of the escrow transaction
    modifier onlyReceiver(uint _orderId) {
        require(
            msg.sender == escrows[_orderId].receiver,
            "Only Receiver can call this"
        );
        _;
    }

    /// @notice Contract constructor - initializes default fee structure and time limits
    /// @dev Sets up the six-tier fee structure and merchant verification rates
    constructor() {
        timeProcess = 45 * 60; // 45 minutes
        // Initialize fee scale values
        scale1FixedFee = 5; // 0.5 token (without decimals)
        scale2Percent = 125; // 1.25%
        scale3Percent = 100; // 1%
        scale4Percent = 75; // 0.75%
        scale5Percent = 50; // 0.5%
        scale6Percent = 25; // 0.25%
        merchantVerifiedPercent = 25; // 0.25%
    }

    // ================== Begin External functions ==================   
    
    /// @notice Sets the time limit for escrow completion
    /// @dev Only callable by contract owner, must be greater than 0
    /// @param _timeProcess Time limit in seconds for completing escrow transactions
    function setTimeProcess(uint256 _timeProcess) external onlyOwner {
        require(_timeProcess >= 15 * 60, "timeProcess must be >= 15 minutes");
        require(_timeProcess <= 2 * 24 * 60 * 60, "timeProcess must be <= 2 days");
        timeProcess = _timeProcess;
        emit SetTimeProcessEvent(timeProcess);
    }

    /// @notice Creates a new escrow transaction with specified parameters
    /// @dev Transfers tokens from sender to contract and initializes escrow data
    /// @param orderId Unique identifier for the escrow transaction
    /// @param receiver Address that will receive the escrowed funds
    /// @param value Amount to be escrowed (in token units)
    /// @param currency ERC20 token contract address for the transaction
    /// @param isSenderMerchant Whether sender has merchant verification status
    /// @param isReceiverMerchant Whether receiver has merchant verification status
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
        e.receiverFee = feeAmountReceiver;
        e.senderFee = feeAmountSender;
        e.currency = currency;
        e.status = EscrowStatus.CRYPTOS_IN_CUSTODY;
        e.created = block.timestamp;
        e.isSenderMerchant = isSenderMerchant;
        e.isReceiverMerchant = isReceiverMerchant;
        e.escrowTimeProcess = timeProcess;
        // Save secondary fields in mappings
        escrowAppeals[orderId] = Appeal(false, false, 0);
        emit EscrowDeposit(orderId, escrows[orderId]);
    }

    /// @notice Releases escrow funds during appeal resolution (owner only)
    /// @dev Only callable by owner when escrow status is APPEAL
    /// @param _orderId The unique identifier of the escrow transaction
    function releaseEscrowOwner(uint _orderId) external onlyOwner {
        require(
            escrows[_orderId].status == EscrowStatus.APPEAL,
            "Status must be APPEAL"
        );
        _releaseEscrow(_orderId,true);
    }

    /// @notice Releases escrow funds to receiver (sender only)
    /// @dev Only callable by sender when escrow is in CRYPTOS_IN_CUSTODY or FIATCOIN_TRANSFERED
    /// @param _orderId The unique identifier of the escrow transaction
    function releaseEscrow(uint _orderId) external onlySender(_orderId) {
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY ||
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED ||
            escrows[_orderId].status == EscrowStatus.APPEAL,
            "Status must be CRYPTOS_IN_CUSTODY or FIATCOIN_TRANSFERED or APPEAL"
        );
        _releaseEscrow(_orderId,false);
    }

    /// @notice Refunds escrow funds to sender (owner only during appeal)
    /// @dev Only callable by owner when status is APPEAL, returns funds + sender fee
    /// @param _orderId The unique identifier of the escrow transaction
    function refundOwner(uint _orderId) external nonReentrant onlyOwner {
        require( 
            escrows[_orderId].status == EscrowStatus.APPEAL,
            "Refund not approved"
        );
        uint256 _amountFeeSender = escrows[_orderId].senderFee;
        escrows[_orderId].status = EscrowStatus.REFUND;
        
        escrows[_orderId].currency.safeTransfer(escrows[_orderId].sender, escrows[_orderId].value + _amountFeeSender);
        emit EscrowRefundOwner(_orderId, escrows[_orderId]);
    }

    /// @notice Withdraws accumulated fees for a specific currency (owner only)
    /// @dev Transfers all available fees to owner address
    /// @param _currency The ERC20 token contract address for fee withdrawal
    function withdrawFees(IERC20 _currency) external onlyOwner {
        uint256 available = feesAvailable[_currency];
        require(available > 0, "No fees available for withdrawal");

        feesAvailable[_currency] = 0;
        _currency.safeTransfer(owner(), available);
        emit FeesWithdrawn(_currency, available, owner());
    }

    /// @notice Retrieves the current status of an escrow transaction
    /// @param _orderId The unique identifier of the escrow transaction
    /// @return The current EscrowStatus of the specified transaction
    function getState(uint _orderId) external view returns (EscrowStatus) {
        return escrows[_orderId].status;
    }

    /// @notice Adds a stablecoin address to the whitelist (owner only)
    /// @dev Only whitelisted tokens can be used for escrow transactions
    /// @param _addressStableToWhitelist The ERC20 token address to whitelist
    function addStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = true;

        emit AddStablesAddressesEvent(_addressStableToWhitelist);
    }

    /// @notice Removes a stablecoin address from the whitelist (owner only)
    /// @dev Prevents the token from being used in new escrow transactions
    /// @param _addressStableToWhitelist The ERC20 token address to remove from whitelist
    function delStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = false;

        emit DelStablesAddressesEvent(_addressStableToWhitelist);
    }

    /// @notice Cancels escrow and refunds sender after timeout period
    /// @dev Only callable by sender after timeProcess has elapsed
    /// @param _orderId The unique identifier of the escrow transaction
    function cancelSender(
        uint256 _orderId
    ) external nonReentrant onlySender(_orderId) {
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );
        require((block.timestamp - escrows[_orderId].created) > escrows[_orderId].escrowTimeProcess, "Time is still running out.");
        escrows[_orderId].status = EscrowStatus.CANCEL_SENDER;
        uint256 _amountFeeSender = escrows[_orderId].senderFee;
        
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].sender,
            escrows[_orderId].value + _amountFeeSender
        );
        emit EscrowCancelSender(_orderId, escrows[_orderId]);
    }

    /// @notice Cancels escrow and refunds sender (receiver initiated)
    /// @dev Only callable by receiver when status allows cancellation
    /// @param _orderId The unique identifier of the escrow transaction
    function cancelReceiver(
        uint256 _orderId
    ) external nonReentrant onlyReceiver(_orderId) {
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY ||
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED,
            "Status must be CRYPTOS_IN_CUSTODY or FIATCOIN_TRANSFERED"
        );
        escrows[_orderId].status = EscrowStatus.CANCEL_RECEIVER;
        uint256 _amountFeeSender = escrows[_orderId].senderFee;
        
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].sender,
            (escrows[_orderId].value + _amountFeeSender)
        );
        emit EscrowCancelReceiver(_orderId, escrows[_orderId]);
    }

    /// @notice Marks escrow as paid by receiver (confirms fiat payment received)
    /// @dev Only callable by receiver when status is CRYPTOS_IN_CUSTODY
    /// @param _orderId The unique identifier of the escrow transaction
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

    /// @notice Marks escrow as paid by owner (administrative override)
    /// @dev Only callable by owner when status is CRYPTOS_IN_CUSTODY
    /// @param _orderId The unique identifier of the escrow transaction
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

    /// @notice Initiates an appeal for dispute resolution
    /// @dev Only sender or receiver can appeal when status is FIATCOIN_TRANSFERED
    /// @param _orderId The unique identifier of the escrow transaction
    /// @param isSender True if sender is appealing, false if receiver is appealing
    /// @param _appealReasonId Numeric code representing the reason for appeal
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
    /// @notice Returns the contract version (currently disabled)
    /// @return Version string of the contract
    // function version() external pure virtual returns (string memory) {
    //     return "5.0";
    // }

    // ================== End External functions that are pure ==================

    /// ================== Begin Public functions ==================

    /// ================== End Public functions ==================

    // ================== Begin Private functions ==================
    /// @notice Internal function to release escrow funds to receiver
    /// @dev Handles fee collection and status updates, prevents reentrancy
    /// @param _orderId The unique identifier of the escrow transaction
    /// @param isOwner True if release is initiated by owner, false if by sender
    function _releaseEscrow(uint _orderId, bool isOwner) private nonReentrant {
        // Only deduct receiver fee from receiver
        uint256 _amountFeeReceiver = escrows[_orderId].receiverFee;
        uint256 _amountFeeSender = escrows[_orderId].senderFee;

        // Add both fees to feesAvailable for withdrawal
        feesAvailable[escrows[_orderId].currency] += (_amountFeeReceiver + _amountFeeSender);

        // Set status as complete before transfer to prevent reentrancy
        if(isOwner){
            escrows[_orderId].status = EscrowStatus.RELEASEOWNER;    
        }else{
            escrows[_orderId].status = EscrowStatus.COMPLETED;
        }

        // Transfer to receiver: total amount minus receiver fee
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].receiver,
            escrows[_orderId].value - _amountFeeReceiver
        );

        emit EscrowComplete(_orderId, escrows[_orderId]);
    }


    /// @notice Calculates fee based on transaction amount and merchant status
    /// @dev Implements six-tier fee structure with merchant discounts
    /// @param amount Transaction amount in token units
    /// @param currency ERC20 token contract for decimal calculation
    /// @param isMerchant Whether the party has merchant verification
    /// @return Calculated fee amount in token units
    function _calculateFee(uint256 amount, IERC20 currency, bool isMerchant) internal view returns (uint256) {
        uint8 decimals = currency.decimals();
        uint256 usdtDecimals = 10 ** uint256(decimals);
        
        // If merchant verified, apply preferential merchant fee (0.25%)
        if (isMerchant) {
            return (amount * merchantVerifiedPercent) / 10000;
        }
        // Fee scales for regular users (continuous ranges)
        uint256 amountUsdt = amount / usdtDecimals;
        if (amountUsdt >= 1 && amountUsdt < 50) {
            // Scale 1: fixed fee
            return scale1FixedFee * usdtDecimals / 10; // scale1FixedFee is decimal, e.g.: 0.5 -> 5, divided by 10
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
        // Default: no fee for amounts < 1 USDT
        return 0;
    }

    // Custom errors for gas optimization
    error InvalidFeeHierarchy(uint8 violationType);
    error InvalidScaleValue();
    error InvalidScaleId();
    error ArrayLengthMismatch();
    error EmptyArray();

    function _validateFeeHierarchy(
        uint16 _scale2,
        uint16 _scale3,
        uint16 _scale4,
        uint16 _scale5,
        uint16 _scale6,
        uint16 _merchant
    ) internal pure {
        unchecked {
            if (_scale2 < _scale3) revert InvalidFeeHierarchy(1);
            if (_scale3 < _scale4) revert InvalidFeeHierarchy(2);
            if (_scale4 < _scale5) revert InvalidFeeHierarchy(3);
            if (_scale5 < _scale6) revert InvalidFeeHierarchy(4);
            if (_scale6 < _merchant) revert InvalidFeeHierarchy(5);
            // Removed redundant validation _scale5 >= _merchant
        }
    }

    /// @notice Internal function to set scale value and emit event
    /// @dev Optimized internal function to reduce code duplication
    /// @param scaleId Scale identifier (2-6)
    /// @param value New scale value
    function _setScaleValue(uint8 scaleId, uint16 value) internal {
        if (scaleId == 2) {
            uint16 oldValue = scale2Percent;
            scale2Percent = value;
            emit Scale2PercentUpdated(oldValue, value);
        } else if (scaleId == 3) {
            uint16 oldValue = scale3Percent;
            scale3Percent = value;
            emit Scale3PercentUpdated(oldValue, value);
        } else if (scaleId == 4) {
            uint16 oldValue = scale4Percent;
            scale4Percent = value;
            emit Scale4PercentUpdated(oldValue, value);
        } else if (scaleId == 5) {
            uint16 oldValue = scale5Percent;
            scale5Percent = value;
            emit Scale5PercentUpdated(oldValue, value);
        } else if (scaleId == 6) {
            uint16 oldValue = scale6Percent;
            scale6Percent = value;
            emit Scale6PercentUpdated(oldValue, value);
        } else {
            revert InvalidScaleId();
        }
    }

    /// @notice Sets the fixed fee for scale 1 transactions (1-50 USDT)
    /// @dev Only callable by owner, must be <= 5 (representing 0.5 tokens)
    /// @param value New fixed fee value (0.5 token = 5)
    function setScale1FixedFee(uint256 value) external onlyOwner {
        require(value <= 5, "Scale1FixedFee must be <= 0.5 token");
        uint256 oldValue = scale1FixedFee;
        scale1FixedFee = value;
        emit Scale1FixedFeeUpdated(oldValue, value);
    }
    /// @notice Sets all scale percentages in a single transaction
    /// @dev Only callable by owner, optimized for batch operations
    /// @param _scale2 Scale 2 percentage (50-100 USDT)
    /// @param _scale3 Scale 3 percentage (100-1000 USDT)
    /// @param _scale4 Scale 4 percentage (1000-5000 USDT)
    /// @param _scale5 Scale 5 percentage (5000-10000 USDT)
    /// @param _scale6 Scale 6 percentage (10000+ USDT)
    function setAllScales(
        uint16 _scale2,
        uint16 _scale3,
        uint16 _scale4,
        uint16 _scale5,
        uint16 _scale6
    ) external onlyOwner {
        if (_scale2 > 200 || _scale3 > 200 || _scale4 > 200 || 
            _scale5 > 200 || _scale6 > 200) revert InvalidScaleValue();
            
        _validateFeeHierarchy(_scale2, _scale3, _scale4, _scale5, _scale6, merchantVerifiedPercent);
        
        _setScaleValue(2, _scale2);
        _setScaleValue(3, _scale3);
        _setScaleValue(4, _scale4);
        _setScaleValue(5, _scale5);
        _setScaleValue(6, _scale6);
    }

    /// @notice Sets multiple scale percentages selectively
    /// @dev Only callable by owner, allows partial updates
    /// @param scaleIds Array of scale IDs to update (2-6)
    /// @param scaleValues Array of new percentage values
    function setMultipleScales(
        uint8[] calldata scaleIds,
        uint16[] calldata scaleValues
    ) external onlyOwner {
        if (scaleIds.length != scaleValues.length) revert ArrayLengthMismatch();
        if (scaleIds.length == 0) revert EmptyArray();
        
        // Create temporary array with current values
        uint16[5] memory newScales = [
            scale2Percent, scale3Percent, scale4Percent, 
            scale5Percent, scale6Percent
        ];
        
        // Apply changes to temporary array and validate inputs
        for (uint i = 0; i < scaleIds.length; i++) {
            if (scaleIds[i] < 2 || scaleIds[i] > 6) revert InvalidScaleId();
            if (scaleValues[i] > 200) revert InvalidScaleValue();
            newScales[scaleIds[i] - 2] = scaleValues[i];
        }
        
        // Validate complete hierarchy
        _validateFeeHierarchy(
            newScales[0], newScales[1], newScales[2], 
            newScales[3], newScales[4], merchantVerifiedPercent
        );
        
        // Apply changes and emit events
        for (uint i = 0; i < scaleIds.length; i++) {
            _setScaleValue(scaleIds[i], scaleValues[i]);
        }
    }

    /// @notice Sets the percentage fee for scale 2 transactions (50-100 USDT)
    /// @dev Only callable by owner, must be <= 200 basis points (2%)
    /// @param value New percentage fee in basis points (125 = 1.25%)
    function setScale2Percent(uint16 value) external onlyOwner {
        if (value > 200) revert InvalidScaleValue();
        _validateFeeHierarchy(value, scale3Percent, scale4Percent, scale5Percent, scale6Percent, merchantVerifiedPercent);
        _setScaleValue(2, value);
    }
    /// @notice Sets the percentage fee for scale 3 transactions (100-1000 USDT)
    /// @dev Only callable by owner, must be <= 200 basis points (2%)
    /// @param value New percentage fee in basis points (100 = 1%)
    function setScale3Percent(uint16 value) external onlyOwner {
        if (value > 200) revert InvalidScaleValue();
        _validateFeeHierarchy(scale2Percent, value, scale4Percent, scale5Percent, scale6Percent, merchantVerifiedPercent);
        _setScaleValue(3, value);
    }
    /// @notice Sets the percentage fee for scale 4 transactions (1000-5000 USDT)
    /// @dev Only callable by owner, must be <= 200 basis points (2%)
    /// @param value New percentage fee in basis points (75 = 0.75%)
    function setScale4Percent(uint16 value) external onlyOwner {
        if (value > 200) revert InvalidScaleValue();
        _validateFeeHierarchy(scale2Percent, scale3Percent, value, scale5Percent, scale6Percent, merchantVerifiedPercent);
        _setScaleValue(4, value);
    }
    /// @notice Sets the percentage fee for scale 5 transactions (5000-10000 USDT)
    /// @dev Only callable by owner, must be <= 200 basis points (2%)
    /// @param value New percentage fee in basis points (50 = 0.5%)
    function setScale5Percent(uint16 value) external onlyOwner {
        if (value > 200) revert InvalidScaleValue();
        _validateFeeHierarchy(scale2Percent, scale3Percent, scale4Percent, value, scale6Percent, merchantVerifiedPercent);
        _setScaleValue(5, value);
    }
    /// @notice Sets the percentage fee for scale 6 transactions (10000+ USDT)
    /// @dev Only callable by owner, must be <= 200 basis points (2%)
    /// @param value New percentage fee in basis points (25 = 0.25%)
    function setScale6Percent(uint16 value) external onlyOwner {
        if (value > 200) revert InvalidScaleValue();
        _validateFeeHierarchy(scale2Percent, scale3Percent, scale4Percent, scale5Percent, value, merchantVerifiedPercent);
        _setScaleValue(6, value);
    }

    
    /// @notice Sets the preferential percentage fee for verified merchants
    /// @dev Only callable by owner, must be <= 200 basis points (2%)
    /// @param value New percentage fee in basis points (25 = 0.25%)
    function setMerchantVerifiedPercent(uint16 value) external onlyOwner {
        if (value > 200) revert InvalidScaleValue();
        _validateFeeHierarchy(scale2Percent, scale3Percent, scale4Percent, scale5Percent, scale6Percent, value);
        uint16 oldValue = merchantVerifiedPercent;
        merchantVerifiedPercent = value;
        emit MerchantVerifiedPercentUpdated(oldValue, value);
    }

    /// @notice Public wrapper for fee calculation (for testing and frontends)
    /// @dev Exposes internal fee calculation logic for external use
    /// @param amount Transaction amount in token units
    /// @param currency ERC20 token contract for decimal calculation  
    /// @param isMerchant Whether the party has merchant verification
    /// @return Calculated fee amount in token units
    function publicCalculateFee(uint256 amount, IERC20 currency, bool isMerchant) external view returns (uint256) {
        return _calculateFee(amount, currency, isMerchant);
    }

    function renounceOwnership() public view override onlyOwner {
        revert("RenounceOwnership is disabled");
    }

    // ================== End Private functions ==================
}