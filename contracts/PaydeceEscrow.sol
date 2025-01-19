// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./IERC20.sol";
import "./Address.sol";
import "./SafeERC20.sol";
import "./ReentrancyGuard.sol";
import "./Context.sol";
import "./Ownable.sol";

contract PaydeceEscrow is ReentrancyGuard, Ownable {
    // 0.1 is 100 because it is multiplied by a thousand => 0.1 X 1000 = 100
    uint16 public feeReceiver;
    uint16 public feeSender;
    uint256 public feesAvailableNativeCoin;
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
        UNKNOWN_6,
        REFUND, // 7,
        UNKNOWN_8,
        CANCEL_SENDER, //9
        CANCEL_RECEIVER //10
    }

    struct Escrow {
        address payable sender; //Sender
        address payable receiver; //Receiver
        bool sender_premium;
        bool receiver_premium;
        uint256 value; // Purchase amount
        uint16 receiverfee; //Fee Receiver
        uint16 senderfee; //Fee Sender
        IERC20 currency; //Money
        EscrowStatus status; //Status
        uint256 created;
    }

    event EscrowDeposit(uint indexed orderId, Escrow escrow);
    event EscrowComplete(uint indexed orderId, Escrow escrow);
    event EscrowCancelSender(uint indexed orderId, Escrow escrow);
    event EscrowCancelReceiver(uint indexed orderId, Escrow escrow);
    event EscrowMarkAsPaid(uint indexed orderId, Escrow escrow);
    event EscrowMarkAsPaidOwner(uint indexed orderId, Escrow escrow);
    event EscrowRefundSender(uint indexed orderId, Escrow escrow);
    event EscrowRefundSenderNativeCoin(uint indexed orderId, Escrow escrow);
    event setTimeProcessEvent(uint256 timeProcess);
    event addStablesAddressesEvent(address addressStable);
    event delStablesAddressesEvent(address addressStable);
    event setFeeSenderEvent(uint16 feeSender);
    event setFeeReceiverEvent(uint16 feeReceiver);

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
        require(
            _feeReceiver >= 0 && _feeReceiver <= 500,
            "The fee can be from 0% to 0.5%"
        );
        feeReceiver = _feeReceiver;

        emit setFeeReceiverEvent(_feeReceiver);
    }

    /**
     * @notice  Set Fee Sender
     * @param   _feeSender  .
     */
    function setFeeSender(uint16 _feeSender) external onlyOwner() {
        require(
            _feeSender >= 0 && _feeSender <= 500,
            "The fee can be from 0% to 0.5%"
        );
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
     * @param   _sender_premium  .
     * @param   _receiver_premium  .
     */
    function createEscrow(
        uint _orderId,
        address payable _receiver,
        uint256 _value,
        IERC20 _currency,
        bool _sender_premium,
        bool _receiver_premium
    ) external virtual {
        require(_receiver != address(0), "The address receiver cannot be empty");

        require(
            escrows[_orderId].status == EscrowStatus.Unknown,
            "Escrow already exists"
        );

        require(
            whitelistedStablesAddresses[address(_currency)],
            "Address Stable to be whitelisted"
        );

        require(msg.sender != _receiver, "Receiver cannot be the same as sender");

        require(_value > 0, "The parameter value cannot be zero");

        uint8 _decimals = _currency.decimals();

        //Gets the amount to transfer from the buyer to the contract
        uint256 _amountFeeSender = 0;
        
        if (!_sender_premium) {
            _amountFeeSender = ((_value * (feeSender * 10 ** _decimals)) /
                (100 * 10 ** _decimals)) / 1000;

            // Add fee
            feesAvailable[_currency] += _amountFeeSender;    
        }        

        //Transfer USDT to contract
        _currency.safeTransferFrom(
            msg.sender,
            address(this),
            (_value + _amountFeeSender)
        );

        escrows[_orderId] = Escrow(
            payable(msg.sender),
            _receiver,
            _sender_premium,
            _receiver_premium,
            _value,
            feeReceiver,
            feeSender,
            _currency,
            EscrowStatus.CRYPTOS_IN_CUSTODY,
            block.timestamp
        );

        emit EscrowDeposit(_orderId, escrows[_orderId]);
    }

    /**
     * @notice  Create Escrow Native Coin
     * @param   _orderId  .
     * @param   _receiver  .
     * @param   _value  .
     * @param   _sender_premium  .
     * @param   _receiver_premium  .
     */
    function createEscrowNativeCoin(
        uint _orderId,
        address payable _receiver,
        uint256 _value,
        bool _sender_premium,
        bool _receiver_premium
    ) external payable virtual {
        require(
            escrows[_orderId].status == EscrowStatus.Unknown,
            "Escrow already exists"
        );
        require(_receiver != address(0), "The address receiver cannot be empty");

        require(msg.sender != _receiver, "Receiver cannot be the same as sender");

        require(_value > 0, "The parameter value cannot be zero");

        uint8 _decimals = 18;

        //Gets the amount to transfer from the buyer to the contract
        uint256 _amountFeeSender = 0;

        if (!_sender_premium) {
            _amountFeeSender = ((_value * (feeSender * 10 ** _decimals)) /
                (100 * 10 ** _decimals)) / 1000;

            //Add fee
            feesAvailableNativeCoin += _amountFeeSender;    
        }

        //Verification was added for the user to send the exact amount of native tokens to escrow.
        require((_value + _amountFeeSender) == msg.value, "Incorrect amount");

        escrows[_orderId] = Escrow(
            payable(msg.sender),
            _receiver,
            _sender_premium,
            _receiver_premium,
            _value,
            feeReceiver,
            feeSender,
            IERC20(address(0)),
            EscrowStatus.CRYPTOS_IN_CUSTODY,
            block.timestamp
        );

        emit EscrowDeposit(_orderId, escrows[_orderId]);
    }

    /**
     * @notice  Release Escrow Owner
     * @param   _orderId  .
     */
    function releaseEscrowOwner(uint _orderId) external onlyOwner {
        _releaseEscrow(_orderId);
    }

    /**
     * @notice  Release Escrow Owner Native Coin
     * @param   _orderId  .
     */
    function releaseEscrowOwnerNativeCoin(uint _orderId) external onlyOwner {
        _releaseEscrowNativeCoin(_orderId);
    }

    /**
     * @notice  Release Escrow
     * @param   _orderId  .
     */
    function releaseEscrow(uint _orderId) external onlySender(_orderId) {
        _releaseEscrow(_orderId);
    }
    

    /**
     * @notice  Release Escrow Native Coin
     * @param   _orderId  .
     */
    function releaseEscrowNativeCoin(
        uint _orderId
    ) external onlySender(_orderId) {
        _releaseEscrowNativeCoin(_orderId);
    }

    /**
     * @notice  release funds to the Sender - cancelled contract
     * @param   _orderId  .
     */
    function refundSender(uint _orderId) external nonReentrant onlyOwner {
        require( 
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY || 
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED,
            "Refund not approved"
        );

        uint256 _value = escrows[_orderId].value;
        address _sender = escrows[_orderId].sender;
        IERC20 _currency = escrows[_orderId].currency;

        uint256 _amountFeeSender = getAmountFeeSender(_orderId, false);

        // write as refun, in case transfer fails
        escrows[_orderId].status = EscrowStatus.REFUND;

        //update fee
        feesAvailable[escrows[_orderId].currency] -= _amountFeeSender;

        _currency.safeTransfer(_sender, _value + _amountFeeSender);

        emit EscrowRefundSender(_orderId, escrows[_orderId]);
    }

    /**
     * @notice  Refund Sender Native Coin
     * @param   _orderId  .
     */
    function refundSenderNativeCoin(
        uint _orderId
    ) external nonReentrant onlyOwner {
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY || 
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED,
            "Refund not approved"
        );

        uint256 _value = escrows[_orderId].value;
        address _sender = escrows[_orderId].sender;

        uint256 _amountFeeSender = getAmountFeeSender(_orderId, true);

        // write as refun, in case transfer fails
        escrows[_orderId].status = EscrowStatus.REFUND;

        feesAvailableNativeCoin -= _amountFeeSender;

        //Transfer call
        (bool sent, ) = payable(address(_sender)).call{
            value: _value + _amountFeeSender
        }("");
        require(sent, "Transfer failed.");

        emit EscrowRefundSenderNativeCoin(_orderId, escrows[_orderId]);
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
     * @notice  Withdraw Fees Native Coin
     */
    function withdrawFeesNativeCoin() external onlyOwner {
        uint256 _amount;

        // This check also prevents underflow
        require(feesAvailableNativeCoin > 0, "Amount > feesAvailable");

        _amount = feesAvailableNativeCoin;

        feesAvailableNativeCoin -= _amount;

        //Transfer
        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        require(sent, "Transfer failed.");
    }

    /**
     * @notice  Get State
     * @param   _orderId  .
     * @return  EscrowStatus  .
     */
    function getState(uint _orderId) external view returns (EscrowStatus) {
        Escrow memory _escrow = escrows[_orderId];
        return _escrow.status;
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

        uint256 _timeDiff = block.timestamp - escrows[_orderId].created;

        // Process time validation
        require(_timeDiff > timeProcess, "Time is still running out.");

        // Status change
        escrows[_orderId].status = EscrowStatus.CANCEL_SENDER;

        //get Amount Fee Sender
        uint256 _amountFeeSender = getAmountFeeSender(_orderId, false);

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
     * @notice  Cancel Sender Native
     * @param   _orderId  .
     */
    function cancelSenderNative(
        uint256 _orderId
    ) external nonReentrant onlySender(_orderId) {
        // Validate the Escrow status
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        uint256 _timeDiff = block.timestamp - escrows[_orderId].created;

        // Process time validation
        require(_timeDiff > timeProcess, "Time is still running out.");

        // Status change
        escrows[_orderId].status = EscrowStatus.CANCEL_SENDER;

        //get Amount Fee Sender
        uint256 _amountFeeSender = getAmountFeeSender(_orderId, true);

        //update fee
        feesAvailableNativeCoin -= _amountFeeSender; 

        //Transfer call
        (bool sent, ) = payable(address(escrows[_orderId].sender)).call{
            value: (escrows[_orderId].value + _amountFeeSender)
        }("");
        require(sent, "Transfer failed.");

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
        uint256 _amountFeeSender = getAmountFeeSender(_orderId,false);

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
     * @notice  Cancel Receiver Native
     * @param   _orderId  .
     */
    function cancelReceiverNative(
        uint256 _orderId
    ) external nonReentrant onlyReceiver(_orderId) {
        // Validate the Escrow status
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        // Status change
        escrows[_orderId].status = EscrowStatus.CANCEL_RECEIVER;

        //get amountFeeReceiver
        uint256 _amountFeeSender = getAmountFeeSender(_orderId, true);

        //update fee amount
        feesAvailableNativeCoin -= _amountFeeSender;

        (bool sent, ) = escrows[_orderId].sender.call{
            value: escrows[_orderId].value + _amountFeeSender
        }("");
        require(sent, "Transfer failed.");

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

    // ================== End External functions ==================

    // ================== Begin External functions that are pure ==================
    /**
     * @notice  Get Version
     * @return  string  .
     */
    function version() external pure virtual returns (string memory) {
        return "5.0";
    }

    // ================== End External functions that are pure ==================

    /// ================== Begin Public functions ==================

    /// ================== End Public functions ==================

    // ================== Begin Private functions ==================
    /**
     * @notice  Release Escrow
     * @param   _orderId  .
     */
    function _releaseEscrow(uint _orderId) private nonReentrant {
        require(
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED,
            "Status must be FIATCOIN_TRANSFERED"
        );

        //Gets the amount to transfer from the buyer to the contract
        uint256 _amountFeeReceiver = getAmountFeeReceiver(_orderId, false);

        feesAvailable[escrows[_orderId].currency] += _amountFeeReceiver;

        // write as complete, in case transfer fails
        escrows[_orderId].status = EscrowStatus.COMPLETED;

        //Transfer to Receiver Price Asset - FeeReceiver
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].receiver,
            escrows[_orderId].value - _amountFeeReceiver
        );

        emit EscrowComplete(_orderId, escrows[_orderId]);
    }

    /**
     * @notice  Release Escrow Native Coin
     * @param   _orderId  .
     */
    function _releaseEscrowNativeCoin(uint _orderId) private nonReentrant {
        require(
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED,
            "Native Coin has not been deposited"
        );

        //Gets the amount to transfer from the buyer to the contract
        uint256 _amountFeeReceiver = 0;
        if (!escrows[_orderId].receiver_premium) {
            _amountFeeReceiver = getAmountFeeReceiver(_orderId, true);    
        }

        //Record the fees obtained for Paydece
        feesAvailableNativeCoin += _amountFeeReceiver;

        // write as complete, in case transfer fails
        escrows[_orderId].status = EscrowStatus.COMPLETED;

        //Transfer to Receiver Price Asset - FeeReceiver
        (bool sent, ) = escrows[_orderId].receiver.call{
            value: escrows[_orderId].value - _amountFeeReceiver
        }("");
        require(sent, "Transfer failed.");

        emit EscrowComplete(_orderId, escrows[_orderId]);
    }

    /**
     * @notice  Get Amount Fee Receiver
     * @param   _orderId  .
     * @return  uint256  .
     */
    function getAmountFeeReceiver(
        uint256 _orderId,
        bool _native
    ) private view returns (uint256) {
        //get decimal of stable
        uint8 _decimals = 18;
        uint256 _amountFeeReceiver = 0;

        if (_native == false) {
        _decimals = escrows[_orderId].currency.decimals();
        }

        // Validations Premium
        if (!escrows[_orderId].receiver_premium) {
            //get amountFeeReceiver
            _amountFeeReceiver = ((escrows[_orderId].value *
                (escrows[_orderId].receiverfee * 10 ** _decimals)) /
                (100 * 10 ** _decimals)) / 1000;
        }

        return _amountFeeReceiver;
    }

    /**
     * @notice  Get Amount Fee Sender
     * @param   _orderId  .
     * @param   _native  .
     * @return  uint256  .
     */
    function getAmountFeeSender(
        uint256 _orderId,
        bool _native
    ) private view returns (uint256) {
        //get decimal of stable
        uint8 _decimals = 18;
        uint256 _amountFeeSender = 0;

        if (_native == false) {
            _decimals = escrows[_orderId].currency.decimals();
        }

        // Validations Premium
        if (!escrows[_orderId].sender_premium) {
            //get amountFeeReceiver
            _amountFeeSender =
                ((escrows[_orderId].value *
                    (escrows[_orderId].senderfee * 10 ** _decimals)) /
                    (100 * 10 ** _decimals)) /
                1000;
        }

        return _amountFeeSender;
    }
    // ================== End Private functions ==================
}
