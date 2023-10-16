// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./IERC20.sol";
import "./Address.sol";
import "./SafeERC20.sol";
import "./ReentrancyGuard.sol";
import "./Context.sol";
import "./Ownable.sol";

contract PaydeceEscrow is ReentrancyGuard, Ownable {
    // 0.1 es 100 porque se multiplico por mil => 0.1 X 1000 = 100
    uint256 public feeTaker;
    uint256 public feeMaker;
    uint256 public feesAvailableNativeCoin;
    uint256 public timeProcess; //Tiempo que tienen para completar la transaccion

    using SafeERC20 for IERC20;
    mapping(uint => Escrow) public escrows;
    mapping(address => bool) whitelistedStablesAddresses;
    mapping(IERC20 => uint) public feesAvailable;

    enum EscrowStatus {
        Unknown, //0
        ACTIVE, // 1,
        CRYPTOS_IN_CUSTODY, // 2,
        FIATCOIN_TRANSFERED, // 3, dev un metodo publico owner y taker
        COMPLETED, // 4,
        REFUND, // 7,
        CANCEL_MAKER, //9
        CANCEL_TAKER //10
    }

    struct Escrow {
        address payable maker; //Comprador
        address payable taker; //Vendedor
        bool maker_premium;
        bool taker_premium;
        uint256 value; //Monto compra
        uint256 takerfee; //Comision vendedor
        uint256 makerfee; //Comision comprador
        IERC20 currency; //Moneda
        EscrowStatus status; //Estado
        uint256 created;
    }

    event EscrowDeposit(uint indexed orderId, Escrow escrow);
    event EscrowComplete(uint indexed orderId, Escrow escrow);
    event EscrowDisputeResolved(uint indexed orderId);
    event EscrowCancelMaker(uint indexed orderId, Escrow escrow);
    event EscrowCancelTaker(uint indexed orderId, Escrow escrow);
    event EscrowMarkAsPaid(uint indexed orderId, Escrow escrow);
    event EscrowMarkAsPaidOwner(uint indexed orderId, Escrow escrow);
    event setFeeMakerEvent(uint256 feeMaker);
    event setFeeTakerEvent(uint256 feeMaker);
    event setTimeProcessEvent(uint256 timeProcess);
    event addStablesAddressesEvent(address addressStable);
    event delStablesAddressesEvent(address addressStable);

    // Maker defined as who buys usdt
    modifier onlyMaker(uint _orderId) {
        require(
            msg.sender == escrows[_orderId].maker,
            "Only Maker can call this"
        );
        _;
    }

    modifier onlyTaker(uint _orderId) {
        require(
            msg.sender == escrows[_orderId].taker,
            "Only Taker can call this"
        );
        _;
    }

    constructor() {
        timeProcess = 45 * 60; //45mi
    }

    // ================== Begin External functions ==================
    function setFeeTaker(uint256 _feeTaker) external onlyOwner {
        require(
            _feeTaker >= 0 && _feeTaker <= (1 * 1000),
            "The fee can be from 0% to 1%"
        );
        feeTaker = _feeTaker;

        emit setFeeTakerEvent(_feeTaker);
    }

    function setFeeMaker(uint256 _feeMaker) external onlyOwner {
        require(
            _feeMaker >= 0 && _feeMaker <= (1 * 1000),
            "The fee can be from 0% to 1%"
        );
        feeMaker = _feeMaker;

        emit setFeeMakerEvent(_feeMaker);
    }

    function setTimeProcess(uint256 _timeProcess) external onlyOwner {
        require(_timeProcess > 0, "The timeProcess can be 0");
        timeProcess = _timeProcess;

        emit setTimeProcessEvent(timeProcess);
    }

    function createEscrow(
        uint _orderId,
        address payable _taker,
        uint256 _value,
        IERC20 _currency,
        bool _maker_premium,
        bool _taker_premium
    ) external virtual {
        require(_taker != address(0), "The address taker cannot be empty");

        require(
            escrows[_orderId].status == EscrowStatus.Unknown,
            "Escrow already exists"
        );

        require(
            whitelistedStablesAddresses[address(_currency)],
            "Address Stable to be whitelisted"
        );

        require(msg.sender != _taker, "taker cannot be the same as maker");

        require(_value > 0, "the parameter value cannot be zero");

        uint8 _decimals = _currency.decimals();
        //Obtiene el monto a transferir desde el comprador al contrato
        uint256 _amountFeeMaker = ((_value * (feeMaker * 10 ** _decimals)) /
            (100 * 10 ** _decimals)) / 1000;

        if (_maker_premium) {
            _amountFeeMaker = 0;
        }

        //Valida el Allowance
        uint256 _allowance = _currency.allowance(msg.sender, address(this));
        require(
            _allowance >= (_value + _amountFeeMaker),
            "Taker approve to Escrow first"
        );

        //Transfer USDT to contract
        _currency.safeTransferFrom(
            msg.sender,
            address(this),
            (_value + _amountFeeMaker)
        );

        escrows[_orderId] = Escrow(
            payable(msg.sender),
            _taker,
            _maker_premium,
            _taker_premium,
            _value,
            feeTaker,
            feeMaker,
            _currency,
            EscrowStatus.CRYPTOS_IN_CUSTODY,
            block.timestamp
        );

        emit EscrowDeposit(_orderId, escrows[_orderId]);
    }

    function createEscrowNativeCoin(
        uint _orderId,
        address payable _taker,
        uint256 _value,
        bool _maker_premium,
        bool _taker_premium
    ) external payable virtual {
        require(
            escrows[_orderId].status == EscrowStatus.Unknown,
            "Escrow already exists"
        );
        require(_taker != address(0), "The address taker cannot be empty");

        require(msg.sender != _taker, "Taker cannot be the same as maker");

        require(_value > 0, "the parameter value cannot be zero");

        uint8 _decimals = 18;
        //Obtiene el monto a transferir desde el comprador al contrato
        uint256 _amountFeeMaker = ((_value * (feeMaker * 10 ** _decimals)) /
            (100 * 10 ** _decimals)) / 1000;

        if (_maker_premium) {
            _amountFeeMaker = 0;
        }

        //Verification was added for the user to send the exact amount of native tokens to escrow.
        require((_value + _amountFeeMaker) == msg.value, "Incorrect amount");

        escrows[_orderId] = Escrow(
            payable(msg.sender),
            _taker,
            _maker_premium,
            _taker_premium,
            _value,
            feeTaker,
            feeMaker,
            IERC20(address(0)),
            EscrowStatus.CRYPTOS_IN_CUSTODY,
            block.timestamp
        );

        emit EscrowDeposit(_orderId, escrows[_orderId]);
    }

    function releaseEscrowOwner(uint _orderId) external onlyOwner {
        _releaseEscrow(_orderId);
    }

    function releaseEscrowOwnerNativeCoin(uint _orderId) external onlyOwner {
        _releaseEscrowNativeCoin(_orderId);
    }

    /* This is called by the maker wallet */
    function releaseEscrow(uint _orderId) external onlyMaker(_orderId) {
        _releaseEscrow(_orderId);
    }

    function releaseEscrowNativeCoin(
        uint _orderId
    ) external onlyMaker(_orderId) {
        _releaseEscrowNativeCoin(_orderId);
    }

    /// release funds to the maker - cancelled contract
    function refundMaker(uint _orderId) external nonReentrant onlyOwner {
        require(
            escrows[_orderId].status != EscrowStatus.REFUND,
            "Refund not approved"
        );

        uint256 _value = escrows[_orderId].value;
        address _maker = escrows[_orderId].maker;
        IERC20 _currency = escrows[_orderId].currency;

        uint256 _amountFeeMaker = getAmountFeeMaker(_orderId, false);

        // write as refun, in case transfer fails
        escrows[_orderId].status = EscrowStatus.REFUND;

        _currency.safeTransfer(_maker, _value + _amountFeeMaker);

        emit EscrowDisputeResolved(_orderId);
    }

    function refundMakerNativeCoin(
        uint _orderId
    ) external nonReentrant onlyOwner {
        require(
            escrows[_orderId].status != EscrowStatus.REFUND,
            "Refund not approved"
        );

        uint256 _value = escrows[_orderId].value;
        address _maker = escrows[_orderId].maker;

        uint256 _amountFeeMaker = getAmountFeeMaker(_orderId, true);

        // write as refun, in case transfer fails
        escrows[_orderId].status = EscrowStatus.REFUND;

        //Transfer call
        (bool sent, ) = payable(address(_maker)).call{
            value: _value + _amountFeeMaker
        }("");
        require(sent, "Transfer failed.");

        emit EscrowDisputeResolved(_orderId);
    }

    function withdrawFees(IERC20 _currency) external onlyOwner {
        uint _amount;

        // This check also prevents underflow
        require(feesAvailable[_currency] > 0, "Amount > feesAvailable");

        _amount = feesAvailable[_currency];

        feesAvailable[_currency] -= _amount;

        _currency.safeTransfer(owner(), _amount);
    }

    function withdrawFeesNativeCoin() external onlyOwner {
        uint256 _amount;

        // This check also prevents underflow
        require(feesAvailableNativeCoin > 0, "Amount > feesAvailable");

        //_amount = feesAvailable[_currency];
        _amount = feesAvailableNativeCoin;

        feesAvailableNativeCoin -= _amount;

        //Transfer
        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        require(sent, "Transfer failed.");
    }

    function getState(uint _orderId) external view returns (EscrowStatus) {
        Escrow memory _escrow = escrows[_orderId];
        return _escrow.status;
    }

    function addStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = true;

        emit addStablesAddressesEvent(_addressStableToWhitelist);
    }

    function delStablesAddresses(
        address _addressStableToWhitelist
    ) external onlyOwner {
        whitelistedStablesAddresses[_addressStableToWhitelist] = false;

        emit delStablesAddressesEvent(_addressStableToWhitelist);
    }

    function CancelMaker(
        uint256 _orderId
    ) external nonReentrant onlyMaker(_orderId) {
        // Valida el estado de la Escrow
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        uint256 _timeDiff = block.timestamp - escrows[_orderId].created;

        // validacióm de tiempo de proceso
        require(_timeDiff > timeProcess, "Time is still running out.");

        // cambio de estado
        escrows[_orderId].status = EscrowStatus.CANCEL_MAKER;

        //get Amount Fee Maker
        uint256 _amountFeeMaker = getAmountFeeMaker(_orderId, false);
        //Transfer to maker
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].maker,
            escrows[_orderId].value + _amountFeeMaker
        );

        // emite evento
        emit EscrowCancelMaker(_orderId, escrows[_orderId]);
    }

    function CancelMakerNative(
        uint256 _orderId
    ) external nonReentrant onlyMaker(_orderId) {
        // Valida el estado de la Escrow
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        uint256 _timeDiff = block.timestamp - escrows[_orderId].created;

        // validacióm de tiempo de proceso
        require(_timeDiff > timeProcess, "Time is still running out.");

        // cambio de estado
        escrows[_orderId].status = EscrowStatus.CANCEL_MAKER;

        //get Amount Fee Maker
        uint256 _amountFeeMaker = getAmountFeeMaker(_orderId, true);

        //Transfer call
        (bool sent, ) = payable(address(escrows[_orderId].maker)).call{
            value: (escrows[_orderId].value + _amountFeeMaker)
        }("");
        require(sent, "Transfer failed.");

        // emite evento
        emit EscrowCancelMaker(_orderId, escrows[_orderId]);
    }

    function CancelTaker(
        uint256 _orderId
    ) external nonReentrant onlyTaker(_orderId) {
        // Valida el estado de la Escrow
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        // cambio de estado
        escrows[_orderId].status = EscrowStatus.CANCEL_TAKER;

        //get amountFeeTaker
        uint256 _amountFeeTaker = getAmountFeeTaker(_orderId, false);

        //update fee amount
        feesAvailable[escrows[_orderId].currency] -= _amountFeeTaker;

        //Transfer to Taker
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].maker,
            (escrows[_orderId].value + _amountFeeTaker)
        );

        // emite evento
        emit EscrowCancelTaker(_orderId, escrows[_orderId]);
    }

    function CancelTakerNative(
        uint256 _orderId
    ) external nonReentrant onlyTaker(_orderId) {
        // Valida el estado de la Escrow
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        // cambio de estado
        escrows[_orderId].status = EscrowStatus.CANCEL_TAKER;

        //get amountFeeTaker
        uint256 _amountFeeTaker = getAmountFeeMaker(_orderId, true);

        //update fee amount
        feesAvailable[escrows[_orderId].currency] -= _amountFeeTaker;

        //Transfer to taker Price Asset - FeeTaker
        // (bool sent, ) = escrows[_orderId].maker.call{
        //     value: escrows[_orderId].value + _amountFeeTaker
        // }("");
        // require(sent, "Transfer failed.");

        escrows[_orderId].maker.transfer(
            escrows[_orderId].value + _amountFeeTaker
        );
        // escrows[_orderId].maker.transfer(address(this).balance);

        // bool sent = escrows[_orderId].maker.send(_amountFeeTaker);
        // require(sent, "Failed to send Ether");

        // emite evento
        emit EscrowCancelTaker(_orderId, escrows[_orderId]);
    }

    function setMarkAsPaid(uint256 _orderId) external onlyTaker(_orderId) {
        // Valida el estado de la Escrow
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        escrows[_orderId].status = EscrowStatus.FIATCOIN_TRANSFERED;

        // emite evento
        emit EscrowMarkAsPaid(_orderId, escrows[_orderId]);
    }

    function setMarkAsPaidOwner(uint256 _orderId) external onlyOwner {
        // Valida el estado de la Escrow
        require(
            escrows[_orderId].status == EscrowStatus.CRYPTOS_IN_CUSTODY,
            "Status must be CRYPTOS_IN_CUSTODY"
        );

        escrows[_orderId].status = EscrowStatus.FIATCOIN_TRANSFERED;

        // emite evento
        emit EscrowMarkAsPaidOwner(_orderId, escrows[_orderId]);
    }

    // ================== End External functions ==================

    // ================== Begin External functions that are pure ==================
    function version() external pure virtual returns (string memory) {
        return "4.1.0";
    }

    // ================== End External functions that are pure ==================

    /// ================== Begin Public functions ==================

    /// ================== End Public functions ==================

    // ================== Begin Private functions ==================
    function _releaseEscrow(uint _orderId) private nonReentrant {
        require(
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED,
            "Status must be FIATCOIN_TRANSFERED"
        );

        //Obtiene el monto a transferir desde el comprador al contrato        //takerfee //makerfee
        uint256 _amountFeeMaker = getAmountFeeMaker(_orderId, false);
        uint256 _amountFeeTaker = getAmountFeeTaker(_orderId, false);

        //feesAvailable += _amountFeeMaker + _amountFeeTaker;
        feesAvailable[escrows[_orderId].currency] +=
            _amountFeeMaker +
            _amountFeeTaker;

        // write as complete, in case transfer fails
        escrows[_orderId].status = EscrowStatus.COMPLETED;

        //Transfer to taker Price Asset - FeeTaker
        escrows[_orderId].currency.safeTransfer(
            escrows[_orderId].taker,
            escrows[_orderId].value - _amountFeeTaker
        );

        emit EscrowComplete(_orderId, escrows[_orderId]);
    }

    function _releaseEscrowNativeCoin(uint _orderId) private nonReentrant {
        require(
            escrows[_orderId].status == EscrowStatus.FIATCOIN_TRANSFERED,
            "Native Coin has not been deposited"
        );

        uint8 _decimals = 18; //Wei

        //Obtiene el monto a transferir desde el comprador al contrato        //takerfee //makerfee
        uint256 _amountFeeMaker = ((escrows[_orderId].value *
            (escrows[_orderId].makerfee * 10 ** _decimals)) /
            (100 * 10 ** _decimals)) / 1000;
        uint256 _amountFeeTaker = ((escrows[_orderId].value *
            (escrows[_orderId].takerfee * 10 ** _decimals)) /
            (100 * 10 ** _decimals)) / 1000;

        // Validaciones Premium
        if (escrows[_orderId].maker_premium) {
            _amountFeeMaker = 0;
        }
        if (escrows[_orderId].taker_premium) {
            _amountFeeTaker = 0;
        }

        //Registra los fees obtenidos para Paydece
        feesAvailableNativeCoin += _amountFeeMaker + _amountFeeTaker;

        // write as complete, in case transfer fails
        escrows[_orderId].status = EscrowStatus.COMPLETED;

        //Transfer to taker Price Asset - FeeTaker
        (bool sent, ) = escrows[_orderId].taker.call{
            value: escrows[_orderId].value - _amountFeeTaker
        }("");
        require(sent, "Transfer failed.");

        emit EscrowComplete(_orderId, escrows[_orderId]);
    }

    function getAmountFeeTaker(
        uint256 _orderId,
        bool _native
    ) private view returns (uint256) {
        //get decimal of stable
        uint8 _decimals = 18;

        if (!_native) {
            _decimals = escrows[_orderId].currency.decimals();
        }

        //get amountFeeTaker
        uint256 _amountFeeTaker = ((escrows[_orderId].value *
            (escrows[_orderId].takerfee * 10 ** _decimals)) /
            (100 * 10 ** _decimals)) / 1000;

        // Validations Premium
        if (escrows[_orderId].taker_premium) {
            _amountFeeTaker = 0;
        }

        return _amountFeeTaker;
    }

    function getAmountFeeMaker(
        uint256 _orderId,
        bool _native
    ) private view returns (uint256) {
        //get decimal of stable
        uint8 _decimals = 18;
        uint256 _amountFeeMaker = 0;

        if (_native == false) {
            _decimals = escrows[_orderId].currency.decimals();
        }

        //get amountFeeTaker
        _amountFeeMaker =
            ((escrows[_orderId].value *
                (escrows[_orderId].makerfee * 10 ** _decimals)) /
                (100 * 10 ** _decimals)) /
            1000;

        // Validations Premium
        if (escrows[_orderId].taker_premium) {
            _amountFeeMaker = 0;
        }

        return _amountFeeMaker;
    }
    // ================== End Private functions ==================
}
