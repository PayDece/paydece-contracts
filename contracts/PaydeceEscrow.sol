// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./IERC20.sol";
import "./SafeERC20.sol";
import "./ReentrancyGuard.sol";
import "./Context.sol";
import "./Ownable.sol";

contract PaydeceEscrow is ReentrancyGuard, Ownable {
    // 0.1 is 100 because it is multiplied by a thousand => 0.1 X 1000 = 100
    uint16 public feeReceiver;
    uint16 public feeSender;
    uint256 public timeProcess; //Time they have to complete the transaction

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
        uint16 receiverfee; //Fee Receiver
        uint16 senderfee; //Fee Sender
        IERC20 currency; //Money
        EscrowStatus status; //Status
        uint256 created;
        Appeal appeal;
    }

    event EscrowDeposit(uint indexed orderId, Escrow escrow);
    event EscrowComplete(uint indexed orderId, Escrow escrow);
    event EscrowCancelSender(uint indexed orderId, Escrow escrow);
    event EscrowCancelReceiver(uint indexed orderId, Escrow escrow);
    event EscrowMarkAsPaid(uint indexed orderId, Escrow escrow);
    event EscrowMarkAsPaidOwner(uint indexed orderId, Escrow escrow);
    event EscrowRefundOwner(uint indexed orderId, Escrow escrow);
    event setTimeProcessEvent(uint256 timeProcess);
    event addStablesAddressesEvent(address addressStable);
    event delStablesAddressesEvent(address addressStable);
    event setFeeSenderEvent(uint16 feeSender);
    event setFeeReceiverEvent(uint16 feeReceiver);
    event EscrowAppealSender(uint indexed orderId, Escrow escrow);
    event EscrowAppealReceiver(uint indexed orderId, Escrow escrow);

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
        feeReceiver = 500; //0.5% fix fee
        feeSender = 500; //0.5% fix fee
    }

    // ================== Begin External functions ==================   
    /**
     * @notice  Set Fee Receiver
     * @param   _feeReceiver  .
     */
    function setFeeReceiver(uint16 _feeReceiver) external onlyOwner() {
        require(_feeReceiver >= 0 && _feeReceiver <= 500,"The fee can be from 0% to 0.5%");
        feeReceiver = _feeReceiver;
        emit setFeeReceiverEvent(_feeReceiver);
    }

    /**
     * @notice  Set Fee Sender
     * @param   _feeSender  .
     */
    function setFeeSender(uint16 _feeSender) external onlyOwner() {
        require(_feeSender >= 0 && _feeSender <= 500,"The fee can be from 0% to 0.5%");
        feeSender = _feeSender;
        emit setFeeSenderEvent(_feeSender);
    }

    /**
     * @notice  Set Time Process
     * @param   _timeProcess  .
     */
    function setTimeProcess(uint256 _timeProcess) external onlyOwner {
        require(_timeProcess > 0, "The timeProcess can be 0");
        timeProcess = _timeProcess;
        emit setTimeProcessEvent(timeProcess);
    }

    /**
     * @notice  Create Escrow
     * @param   _orderId  .
     * @param   _receiver  .
     * @param   _value  .
     * @param   _currency  .
     */
    function createEscrow(
        uint _orderId,
        address payable _receiver,
        uint256 _value,
        IERC20 _currency
    ) external virtual {
        require(_receiver != address(0), "The address receiver cannot be empty");

        require(escrows[_orderId].status == EscrowStatus.Unknown,"Escrow already exists");

        require(
            whitelistedStablesAddresses[address(_currency)],
            "Address Stable to be whitelisted"
        );

        require(msg.sender != _receiver, "Receiver cannot be the same as sender");

        require(_value > 0, "The parameter value cannot be zero");

        //Gets the amount to transfer from the buyer to the contract
        uint256 _amountFeeSender = 0;
        
        _amountFeeSender = ((_value * (feeSender * 10 ** _currency.decimals())) /
            (100 * 10 ** _currency.decimals())) / 1000;

        // Add fee
        feesAvailable[_currency] += _amountFeeSender;    

        //Transfer USDT to contract
        _currency.safeTransferFrom(
            msg.sender,
            address(this),
            (_value + _amountFeeSender)
        );

        // Appeal memory _appeal = Appeal(false, false, 0);

        escrows[_orderId] = Escrow(
            payable(msg.sender),
            _receiver,
            _value,
            feeReceiver,
            feeSender,
            _currency,
            EscrowStatus.CRYPTOS_IN_CUSTODY,
            block.timestamp,
            Appeal(false, false, 0)
        );

        emit EscrowDeposit(_orderId, escrows[_orderId]);
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
        require(escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED || escrows[_orderId].status == EscrowStatus.APPEAL ,"Status must be FIATCOIN_TRANSFERED");
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

        uint256 _amountFeeSender = getAmountFeeSender(_orderId);

        // write as refun, in case transfer fails
        escrows[_orderId].status = EscrowStatus.REFUND;

        //update fee
        feesAvailable[escrows[_orderId].currency] -= _amountFeeSender;

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

        feesAvailable[_currency] -= _amount;

        _currency.safeTransfer(owner(), _amount);
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

        emit addStablesAddressesEvent(_addressStableToWhitelist);
    }

    /**
     * @notice  Delete Stables Addresses
     * @param   _addressStableToWhitelist  .
     */
    function delStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = false;

        emit delStablesAddressesEvent(_addressStableToWhitelist);
    }

    /**
     * @notice  Cancel Sender
     * @param   _orderId  .
     */
    function cancelSender(
        uint256 _orderId
    ) external nonReentrant onlySender(_orderId) {
        // Validate the Escrow status
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        // Process time validation
        require((block.timestamp - escrows[_orderId].created) > timeProcess, "Time is still running out.");

        // Status change
        escrows[_orderId].status = EscrowStatus.CANCEL_SENDER;

        //get Amount Fee Sender
        uint256 _amountFeeSender = getAmountFeeSender(_orderId);

        //update frees
        feesAvailable[escrows[_orderId].currency] -= _amountFeeSender;

        //Transfer to Sender
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].sender,
            escrows[_orderId].value + _amountFeeSender
        );

        // emit event
        emit EscrowCancelSender(_orderId, escrows[_orderId]);
    }

    /**
     * @notice  Cancel Receiver
     * @param   _orderId  .
     */
    function cancelReceiver(
        uint256 _orderId
    ) external nonReentrant onlyReceiver(_orderId) {
        // Validate the Escrow status
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        // Status change
        escrows[_orderId].status = EscrowStatus.CANCEL_RECEIVER;

        //get amountFeeSender
        uint256 _amountFeeSender = getAmountFeeSender(_orderId);

        //update fee amount
        feesAvailable[escrows[_orderId].currency] -= _amountFeeSender;

        //Transfer to Receiver
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].sender,
            (escrows[_orderId].value + _amountFeeSender)
        );

        // emit event
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
    require(
        escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED && escrows[_orderId].status != EscrowStatus.APPEAL,
        "Status must be FIATCOIN_TRANSFERED or APPEAL"
    );

    if (isSender) {
        require(msg.sender == escrows[_orderId].sender, "Only sender can appeal");
        escrows[_orderId].appeal.appealSender = true;        
        emit EscrowAppealSender(_orderId, escrows[_orderId]);
    } else {
        require(msg.sender == escrows[_orderId].receiver, "Only receiver can appeal");
        escrows[_orderId].appeal.appealReceiver = true;
        emit EscrowAppealReceiver(_orderId, escrows[_orderId]);
    }

    escrows[_orderId].appeal.appealReasonId = _appealReasonId;
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
        

        //Gets the amount to transfer from the buyer to the contract
        uint256 _amountFeeReceiver = getAmountFeeReceiver(_orderId);

        feesAvailable[escrows[_orderId].currency] += _amountFeeReceiver;

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

    /**
     * @notice  Get Amount Fee Receiver
     * @param   _orderId  .
     * @return  uint256  .
     */
    function getAmountFeeReceiver(
        uint256 _orderId
    ) private view returns (uint256) {
        //get decimal of stable
        uint8 _decimals = 18;
        uint256 _amountFeeReceiver = 0;

        _decimals = escrows[_orderId].currency.decimals();
        
        _amountFeeReceiver = ((escrows[_orderId].value *
            (escrows[_orderId].receiverfee * 10 ** _decimals)) /
            (100 * 10 ** _decimals)) / 1000;

        return _amountFeeReceiver;
    }

    /**
     * @notice  Get Amount Fee Sender
     * @param   _orderId  .
     * @return  uint256  .
     */
    function getAmountFeeSender(
        uint256 _orderId
    ) private view returns (uint256) {
        //get decimal of stable
        uint8 _decimals = 18;
        uint256 _amountFeeSender = 0;

        _decimals = escrows[_orderId].currency.decimals();

        _amountFeeSender =
            ((escrows[_orderId].value *
                (escrows[_orderId].senderfee * 10 ** _decimals)) /
                (100 * 10 ** _decimals)) /
            1000;

        return _amountFeeSender;
    }
    // ================== End Private functions ==================
}