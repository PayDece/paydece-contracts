// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./IERC20.sol";
import "./SafeERC20.sol";
import "./ReentrancyGuard.sol";
import "./Context.sol";
import "./Ownable.sol";

contract PaydeceEscrow is ReentrancyGuard, Ownable {
    // 0.1 is 100 because it is multiplied by a thousand => 0.1 X 1000 = 100
    uint256 public timeProcess; //Time they have to complete the transaction

    // Variables de fee configurables para cada escala
    uint256 public scale1FixedFee; // valor entero, ej: 0.5 para medio token
    uint16 public scale2Percent; // 1.25% = 125
    uint16 public scale3Percent; // 1% = 100
    uint16 public scale4Percent; // 0.75% = 75
    uint16 public scale5Percent; // 0.5% = 50
    uint16 public scale6Percent; // 0.25% = 25
    uint16 public merchantVerifiedPercent; // 0.25% = 25

    using SafeERC20 for IERC20;
    mapping(uint => Escrow) public escrows;
    mapping(address => bool) private whitelistedStablesAddresses;
    mapping(IERC20 => uint) public feesAvailable;

    enum EscrowStatus {
        Unknown, //0
        ACTIVE, // 1,
        CRYPTOS_IN_CUSTODY, // 2,
        FIATCOIN_TRANSFERED, // 3,
        COMPLETED, // 4,
        UNKNOWN_5,
        APPEAL, // 6,
        REFUND, // 7,
        RELEASEOWNER, // 8 ReleaseOwner
        CANCEL_SENDER, //9
        CANCEL_RECEIVER //10
    }

    struct Appeal {
        bool appealSender;
        bool appealReceiver;
        uint16 appealReasonId;
    }

    struct Escrow {
        address payable sender; //Sender
        address payable receiver; //Receiver
        uint256 value; // Purchase amount
        uint256 receiverfee; //Fee Receiver
        uint256 senderfee; //Fee Sender
        IERC20 currency; //Money
        EscrowStatus status; //Status
        uint256 created;
        bool isSenderMerchant;
        bool isReceiverMerchant;
        uint256 escrowTimeProcess; // Time process value stored at escrow creation
    }

    // Mappings para campos secundarios
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
    event FeesWithdrawn(IERC20 indexed currency, uint256 amount, address indexed to);
    event Scale1FixedFeeUpdated(uint256 oldValue, uint256 newValue);
    event Scale2PercentUpdated(uint16 oldValue, uint16 newValue);
    event Scale3PercentUpdated(uint16 oldValue, uint16 newValue);
    event Scale4PercentUpdated(uint16 oldValue, uint16 newValue);
    event Scale5PercentUpdated(uint16 oldValue, uint16 newValue);
    event Scale6PercentUpdated(uint16 oldValue, uint16 newValue);
    event MerchantVerifiedPercentUpdated(uint16 oldValue, uint16 newValue);

    /**
     * @notice  modifier only the Sender
     * @param   _orderId  .
     */
    modifier onlySender(uint _orderId) {
        require(
            msg.sender == escrows[_orderId].sender,
            "Only Sender can call this"
        );
        _;
    }

    /**
     * @notice  modifier only the Receiver
     * @param   _orderId  .
     */
    modifier onlyReceiver(uint _orderId) {
        require(
            msg.sender == escrows[_orderId].receiver,
            "Only Receiver can call this"
        );
        _;
    }

    constructor() {
        timeProcess = 45 * 60; //45mi
        // Inicializar valores de fee escalas
        scale1FixedFee = 5; // 0.5 token (sin decimales)
        scale2Percent = 125; // 1.25%
        scale3Percent = 100; // 1%
        scale4Percent = 75; // 0.75%
        scale5Percent = 50; // 0.5%
        scale6Percent = 25; // 0.25%
        merchantVerifiedPercent = 25; // 0.25%
    }

    // ================== Begin External functions ==================   
    
    /**
     * @notice  Set Time Process
     * @param   _timeProcess  .
     */
    function setTimeProcess(uint256 _timeProcess) external onlyOwner {
        require(_timeProcess > 0, "The timeProcess can be 0");
        timeProcess = _timeProcess;
        emit SetTimeProcessEvent(timeProcess);
    }

    /**
     * @notice  Create Escrow
     * @param   orderId  .
     * @param   receiver  .
     * @param   value  .
     * @param   currency  .
     * @param   isSenderMerchant  .
     * @param   isReceiverMerchant  .
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
        e.escrowTimeProcess = timeProcess;
        // Guardar campos secundarios en mappings
        escrowAppeals[orderId] = Appeal(false, false, 0);
        emit EscrowDeposit(orderId, escrows[orderId]);
    }

    /**
     * @notice  Release Escrow Owner
     * @param   _orderId  .
     */
    function releaseEscrowOwner(uint _orderId) external onlyOwner {
        require(
            escrows[_orderId].status == EscrowStatus.APPEAL,
            "Status must be APPEAL"
        );
        _releaseEscrow(_orderId,true);
    }

    /**
     * @notice  Release Escrow
     * @param   _orderId  .
     */
    function releaseEscrow(uint _orderId) external onlySender(_orderId) {
        require(escrows[_orderId].status != EscrowStatus.APPEAL, "Status must NOT be APPEAL");
        _releaseEscrow(_orderId,false);
    }

    /**
     * @notice  release funds to the Sender - cancelled contract
     * @param   _orderId  .
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
     * @notice  Withdraw Fees
     * @param   _currency  .
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
        emit FeesWithdrawn(_currency, _amount, owner());
    }

    /**
     * @notice  Get State
     * @param   _orderId  .
     * @return  EscrowStatus  .
     */
    function getState(uint _orderId) external view returns (EscrowStatus) {
        return escrows[_orderId].status;
    }

    /**
     * @notice  Add Stables Addresses
     * @param   _addressStableToWhitelist  .
     */
    function addStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = true;

        emit AddStablesAddressesEvent(_addressStableToWhitelist);
    }

    /**
     * @notice  Delete Stables Addresses
     * @param   _addressStableToWhitelist  .
     */
    function delStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = false;

        emit DelStablesAddressesEvent(_addressStableToWhitelist);
    }

    /**
     * @notice  Cancel Sender
     * @param   _orderId  .
     */
    function cancelSender(
        uint256 _orderId
    ) external nonReentrant onlySender(_orderId) {
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );
        require((block.timestamp - escrows[_orderId].created) > escrows[_orderId].escrowTimeProcess, "Time is still running out.");
        escrows[_orderId].status = EscrowStatus.CANCEL_SENDER;
        uint256 _amountFeeSender = escrows[_orderId].senderfee;
        
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].sender,
            escrows[_orderId].value + _amountFeeSender
        );
        emit EscrowCancelSender(_orderId, escrows[_orderId]);
    }

    /**
     * @notice  Cancel Receiver
     * @param   _orderId  .
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
     * @notice  Set Mark As Paid
     * @param   _orderId  .
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
     * @notice  Set Mark As Paid Owner
     * @param   _orderId  .
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
     * @notice  Appeal Sender or Receiver
     * @param   _orderId  .
     * @param   isSender  Indicates if the appeal is from the sender.
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
     * @notice  Get Version
     * @return  string  .
     */
    // function version() external pure virtual returns (string memory) {
    //     return "5.0";
    // }

    // ================== End External functions that are pure ==================

    /// ================== Begin Public functions ==================

    /// ================== End Public functions ==================

    // ================== Begin Private functions ==================
    /**
     * @notice  Release Escrow
     * @param   _orderId  .
     */
    function _releaseEscrow(uint _orderId, bool isOwner) private nonReentrant {
        // Solo descontar el receiverfee al receiver
        uint256 _amountFeeReceiver = escrows[_orderId].receiverfee;
        uint256 _amountFeeSender = escrows[_orderId].senderfee;

        // Sumar ambos fees a feesAvailable
        feesAvailable[escrows[_orderId].currency] += (_amountFeeReceiver + _amountFeeSender);

        // write as complete, in case transfer fails
        if(isOwner){
            escrows[_orderId].status = EscrowStatus.RELEASEOWNER;    
        }else{
            escrows[_orderId].status = EscrowStatus.COMPLETED;
        }

        //Transfer to Receiver Price Asset - FeeReceiver
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].receiver,
            escrows[_orderId].value - _amountFeeReceiver
        );

        emit EscrowComplete(_orderId, escrows[_orderId]);
    }


    function _calculateFee(uint256 amount, IERC20 currency, bool isMerchant) internal view returns (uint256) {
        uint8 decimals = currency.decimals();
        uint256 usdtDecimals = 10 ** uint256(decimals);
        
        // Si alguno es merchant, aplica el fee merchant (0.25%)
        if (isMerchant) {
            return (amount * merchantVerifiedPercent) / 10000;
        }
        // Escalas para el resto (rangos continuos)
        uint256 amountUsdt = amount / usdtDecimals;
        if (amountUsdt >= 1 && amountUsdt < 50) {
            // Escala 1: fijo
            return scale1FixedFee * usdtDecimals / 10; // scale1FixedFee es decimal, ej: 0.5 -> 5, por eso se divide por 10
        } else if (amountUsdt >= 50 && amountUsdt < 100) {
            // Escala 2
            return (amount * scale2Percent) / 10000;
        } else if (amountUsdt >= 100 && amountUsdt < 1000) {
            // Escala 3
            return (amount * scale3Percent) / 10000;
        } else if (amountUsdt >= 1000 && amountUsdt < 5000) {
            // Escala 4
            return (amount * scale4Percent) / 10000;
        } else if (amountUsdt >= 5000 && amountUsdt < 10000) {
            // Escala 5
            return (amount * scale5Percent) / 10000;
        } else if (amountUsdt >= 10000) {
            // Escala 6
            return (amount * scale6Percent) / 10000;
        }
        // Default: 0
        return 0;
    }

    // Setters onlyOwner para cada escala
    function setScale1FixedFee(uint256 value) external onlyOwner {
        require(value <= 5, "Scale1FixedFee must be <= 0.5 token");
        uint256 oldValue = scale1FixedFee;
        scale1FixedFee = value;
        emit Scale1FixedFeeUpdated(oldValue, value);
    }
    function setScale2Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale2Percent must be <= 2% (200)");
        uint16 oldValue = scale2Percent;
        scale2Percent = value;
        emit Scale2PercentUpdated(oldValue, value);
    }
    function setScale3Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale3Percent must be <= 2% (200)");
        uint16 oldValue = scale3Percent;
        scale3Percent = value;
        emit Scale3PercentUpdated(oldValue, value);
    }
    function setScale4Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale4Percent must be <= 2% (200)");
        uint16 oldValue = scale4Percent;
        scale4Percent = value;
        emit Scale4PercentUpdated(oldValue, value);
    }
    function setScale5Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale5Percent must be <= 2% (200)");
        uint16 oldValue = scale5Percent;
        scale5Percent = value;
        emit Scale5PercentUpdated(oldValue, value);
    }
    function setScale6Percent(uint16 value) external onlyOwner {
        require(value <= 200, "Scale6Percent must be <= 2% (200)");
        uint16 oldValue = scale6Percent;
        scale6Percent = value;
        emit Scale6PercentUpdated(oldValue, value);
    }

    
    /**
     * @notice  Set Merchant Verified Percent
     * @param   value  .
     */
    function setMerchantVerifiedPercent(uint16 value) external onlyOwner {
        require(value <= 200, "MerchantVerifiedPercent must be <= 2% (200)");
        uint16 oldValue = merchantVerifiedPercent;
        merchantVerifiedPercent = value;
        emit MerchantVerifiedPercentUpdated(oldValue, value);
    }

    /// @notice Exponer el cálculo de fee para testing y frontends
    function publicCalculateFee(uint256 amount, IERC20 currency, bool isMerchant) external view returns (uint256) {
        return _calculateFee(amount, currency, isMerchant);
    }

    // ================== End Private functions ==================
}