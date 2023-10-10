const { expect } = require("chai");
const { ethers, providers } = require("hardhat");

describe("setFeeMaker", () => {
  it("should 1%", async () => {
    let PaydeceEscrow, paydeceEscrow;
    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await paydeceEscrow.setFeeMaker(1);
    await paydeceEscrow.setFeeTaker(1);

    const feeMaker = await paydeceEscrow.feeMaker();
    expect(Number(feeMaker)).to.equal(Number(1));

    const feeTaker = await paydeceEscrow.feeTaker();
    expect(Number(feeTaker)).to.equal(Number(1));

    await expect(
      paydeceEscrow.connect(other).setFeeMaker("1000")
    ).to.be.revertedWith("caller is not the owner");

    await expect(
      paydeceEscrow.connect(other).setFeeTaker("1000")
    ).to.be.revertedWith("caller is not the owner");

    await expect(paydeceEscrow.setFeeTaker("100000")).to.be.revertedWith(
      "The fee can be from 0% to 1%"
    );

    await expect(paydeceEscrow.setFeeTaker("100000")).to.be.revertedWith(
      "The fee can be from 0% to 1%"
    );
  });

  it("should revert with message 'The fee can be from 0% to 1%", async () => {
    let PaydeceEscrow, paydeceEscrow;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await expect(paydeceEscrow.setFeeMaker(1001)).to.be.revertedWith(
      "The fee can be from 0% to 1%"
    );

    await expect(paydeceEscrow.setFeeTaker(1001)).to.be.revertedWith(
      "The fee can be from 0% to 1%"
    );
  });
});

describe("setFeeMaker", () => {
  it("should revert with message 'The fee can be from 0% to 1%", async () => {
    let PaydeceEscrow, paydeceEscrow;
    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await expect(paydeceEscrow.setFeeMaker(1001)).to.be.revertedWith(
      "The fee can be from 0% to 1%"
    );

    await expect(
      paydeceEscrow.connect(other).setFeeMaker(1)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await paydeceEscrow.setFeeMaker(1);
    const feeMaker = await paydeceEscrow.feeMaker();
    expect(Number(feeMaker)).to.equal(Number(1));
  });
});

//setTimeProcess
describe("setTimeProcess", () => {
  it("should revert with message 'The timeProcess can be >= 0", async () => {
    let PaydeceEscrow, paydeceEscrow;
    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // await expect(paydeceEscrow.setTimeProcess(10)).to.be.revertedWith(
    //   "The timeProcess can be >= 0"
    // );

    await expect(
      paydeceEscrow.connect(owner).setTimeProcess(0)
    ).to.be.revertedWith("The timeProcess can be 0");

    await paydeceEscrow.setTimeProcess(1);

    // expect(Number(feeMaker)).to.equal(Number(1));
  });
});

describe("addStablesAddresses & delStablesAddresses", () => {
  it("you should add and remove the EC20 stable addresses", async () => {
    let PaydeceEscrow, paydeceEscrow;
    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
    await paydeceEscrow.addStablesAddresses(usdtAddress);
    await paydeceEscrow.delStablesAddresses(usdtAddress);

    const usdcAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
    await paydeceEscrow.addStablesAddresses(usdcAddress);
    await paydeceEscrow.delStablesAddresses(usdcAddress);

    //delStablesAddresses Error
    await expect(
      paydeceEscrow.connect(other).addStablesAddresses(usdcAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      paydeceEscrow.connect(other).delStablesAddresses(usdcAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});

describe("PaydeceEscrow StableCoin", function () {
  //StableCoin
  it("should create a escrow and release StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;
    const _amountFeeMaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Address Stable to be whitelisted");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //transfer
    await usdt.transfer(Buyer.address, ammount);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Taker approve to Escrow first");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("taker cannot be the same as maker");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, true, true);

    await expect(
      paydeceEscrow.connect(Buyer).releaseEscrow("1")
    ).to.be.revertedWith("Status must be FIATCOIN_TRANSFERED");

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrow("1")
    ).to.be.revertedWith("Only Maker can call this");

    //call setMarkAsPaid
    await paydeceEscrow.connect(Seller).setMarkAsPaid("1");

    //call releaseEscrow
    await paydeceEscrow.connect(Buyer).releaseEscrow("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    //console.log("scBalance:" + scBalance);
    expect(Number(scBalance)).to.equal(Number(0));

    const buyerBalance = await usdt.balanceOf(Buyer.address);
    //console.log("buyerBalance:" + buyerBalance);
    expect(Number(buyerBalance)).to.equal(Number(0));

    const sellerBalance = await usdt.balanceOf(Seller.address);
    //console.log("sellerBalance:" + sellerBalance);
    expect(Number(sellerBalance)).to.equal(Number(100 * 10 ** decimals));
  });

  it("should releaseEscrowOwner to Seller StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("Address Stable to be whitelisted");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //transfer
    await usdt.transfer(Buyer.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("Taker approve to Escrow first");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("taker cannot be the same as maker");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrow("1")
    ).to.be.revertedWith("Only Maker can call this");

    //call setMarkAsPaid
    await paydeceEscrow.connect(Seller).setMarkAsPaid("1");

    //call releaseEscrowOwner
    await paydeceEscrow.connect(owner).releaseEscrowOwner("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    expect(Number(scBalance)).to.equal(Number(1 * 10 ** decimals));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    expect(Number(buyerBalance)).to.equal(Number(0));
    const sellerBalance = await usdt.balanceOf(Seller.address);
    expect(Number(sellerBalance)).to.equal(Number(100 * 10 ** decimals));
  });

  it("should refund to Buyer StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    //transfer
    await usdt.transfer(Buyer.address, ammount + _amountFeeTaker);

    //call approve
    await usdt
      .connect(Buyer)
      .approve(
        paydeceEscrow.address,
        ammount + _amountFeeTaker + _amountFeeTaker
      );

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    //call refundBuyer Error
    await expect(
      paydeceEscrow.connect(other).refundMaker("1")
    ).to.be.revertedWith("Ownable: caller is not the owner");

    //call refundBuyer
    await paydeceEscrow.connect(owner).refundMaker("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    // console.log("==========scBalance:" + scBalance);
    expect(Number(scBalance)).to.equal(Number(0));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    // console.log("==========buyerBalance:" + buyerBalance);
    expect(Number(buyerBalance)).to.equal(
      Number(100 * 10 ** decimals) + 1000000
    );
    const sellerBalance = await usdt.balanceOf(Seller.address);
    // console.log("==========sellerBalance:" + sellerBalance);
    expect(Number(sellerBalance)).to.equal(Number(0));
  });

  it("should feesAvailable & withdrawFees StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;
    //  console.log("ammount:"+ammount)

    //transfer
    await usdt.transfer(Buyer.address, ammount);
    //call approve
    await usdt.connect(Buyer).approve(paydeceEscrow.address, ammount);

    await expect(
      paydeceEscrow.connect(other).withdrawFees(usdt.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      paydeceEscrow.connect(owner).withdrawFees(usdt.address)
    ).to.be.revertedWith("Amount > feesAvailable");

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    await paydeceEscrow.connect(Seller).setMarkAsPaid("1");

    //call releaseEscrowOwner
    await paydeceEscrow.connect(owner).releaseEscrowOwner("1");

    const _feesAvailable = await paydeceEscrow
      .connect(owner)
      .feesAvailable(usdt.address);
    // console.log("feesAvailable:" + _feesAvailable);

    const scBalance = await usdt.balanceOf(owner.address);

    // console.log("scBalance:" + scBalance);
    //withdrawFees
    const _releaseEscrowOwner = await paydeceEscrow
      .connect(owner)
      .withdrawFees(usdt.address);

    //get Balance
    const scAfterBalance = await usdt.balanceOf(owner.address);
    // console.log("scAfterBalance:" + scAfterBalance);

    expect(Number(scAfterBalance)).to.equal(
      Number(scBalance) + Number(_feesAvailable)
    );
  });

  //CancelTaker
  it("should create a escrow and CancelTaker", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;
    const _amountFeeMaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Address Stable to be whitelisted");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //transfer
    await usdt.transfer(Buyer.address, ammount);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Taker approve to Escrow first");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("taker cannot be the same as maker");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, true, true);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrow("1")
    ).to.be.revertedWith("Only Maker can call this");

    await expect(
      paydeceEscrow.connect(other).CancelTaker("1")
    ).to.be.revertedWith("Only Taker can call this");

    await paydeceEscrow.connect(Seller).CancelTaker("1");

    await expect(
      paydeceEscrow.connect(Seller).CancelTaker("1")
    ).to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    //console.log("scBalance:" + scBalance);
    expect(Number(scBalance)).to.equal(Number(0));

    const buyerBalance = await usdt.balanceOf(Buyer.address);
    //console.log("buyerBalance:" + buyerBalance);
    expect(Number(buyerBalance)).to.equal(Number(100 * 10 ** decimals));

    const sellerBalance = await usdt.balanceOf(Seller.address);
    //console.log("sellerBalance:" + sellerBalance);
    expect(Number(sellerBalance)).to.equal(Number(0));
  });

  //CancelMaker
  it("should create a escrow and CancelMaker", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;
    const _amountFeeMaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Address Stable to be whitelisted");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //transfer
    await usdt.transfer(Buyer.address, ammount);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Taker approve to Escrow first");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("taker cannot be the same as maker");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, true, true);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrow("1")
    ).to.be.revertedWith("Only Maker can call this");

    await paydeceEscrow.connect(owner).setTimeProcess(5000);

    //await paydeceEscrow.connect(Buyer).CancelMaker("1");
    await expect(
      paydeceEscrow.connect(Buyer).CancelMaker("1")
    ).to.be.revertedWith("Time is still running out.");

    await paydeceEscrow.connect(owner).setTimeProcess(1);

    await paydeceEscrow.connect(Buyer).CancelMaker("1");

    await expect(
      paydeceEscrow.connect(Buyer).CancelMaker("1")
    ).to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    //console.log("scBalance:" + scBalance);
    expect(Number(scBalance)).to.equal(Number(0));

    const buyerBalance = await usdt.balanceOf(Buyer.address);
    //console.log("buyerBalance:" + buyerBalance);
    expect(Number(buyerBalance)).to.equal(Number(100 * 10 ** decimals));

    const sellerBalance = await usdt.balanceOf(Seller.address);
    //console.log("sellerBalance:" + sellerBalance);
    expect(Number(sellerBalance)).to.equal(Number(0));
  });
});

describe("PaydeceEscrow StableCoin setMarkAsPaidOwner", function () {
  //StableCoin
  it("should create a escrow and release StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;
    const _amountFeeMaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Address Stable to be whitelisted");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //transfer
    await usdt.transfer(Buyer.address, ammount);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Taker approve to Escrow first");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("taker cannot be the same as maker");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, true, true);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrow("1")
    ).to.be.revertedWith("Only Maker can call this");

    //call setMarkAsPaid
    await paydeceEscrow.connect(owner).setMarkAsPaidOwner("1");

    //call releaseEscrow
    await paydeceEscrow.connect(Buyer).releaseEscrow("1");

    await expect(
      paydeceEscrow.connect(owner).setMarkAsPaidOwner("1")
    ).to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    //console.log("scBalance:" + scBalance);
    expect(Number(scBalance)).to.equal(Number(0));

    const buyerBalance = await usdt.balanceOf(Buyer.address);
    //console.log("buyerBalance:" + buyerBalance);
    expect(Number(buyerBalance)).to.equal(Number(0));

    const sellerBalance = await usdt.balanceOf(Seller.address);
    //console.log("sellerBalance:" + sellerBalance);
    expect(Number(sellerBalance)).to.equal(Number(100 * 10 ** decimals));
  });

  it("should releaseEscrowOwner to Seller StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("Address Stable to be whitelisted");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //transfer
    await usdt.transfer(Buyer.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("Taker approve to Escrow first");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("taker cannot be the same as maker");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrow("1")
    ).to.be.revertedWith("Only Maker can call this");

    //call setMarkAsPaid
    await paydeceEscrow.connect(Seller).setMarkAsPaid("1");

    //call releaseEscrowOwner
    await paydeceEscrow.connect(owner).releaseEscrowOwner("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    expect(Number(scBalance)).to.equal(Number(1 * 10 ** decimals));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    expect(Number(buyerBalance)).to.equal(Number(0));
    const sellerBalance = await usdt.balanceOf(Seller.address);
    expect(Number(sellerBalance)).to.equal(Number(100 * 10 ** decimals));
  });

  it("should refund to Buyer StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    //transfer
    await usdt.transfer(Buyer.address, ammount + _amountFeeTaker);

    //call approve
    await usdt
      .connect(Buyer)
      .approve(
        paydeceEscrow.address,
        ammount + _amountFeeTaker + _amountFeeTaker
      );

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    //call refundBuyer Error
    await expect(
      paydeceEscrow.connect(other).refundMaker("1")
    ).to.be.revertedWith("Ownable: caller is not the owner");

    //call refundBuyer
    await paydeceEscrow.connect(owner).refundMaker("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    // console.log("==========scBalance:" + scBalance);
    expect(Number(scBalance)).to.equal(Number(0));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    // console.log("==========buyerBalance:" + buyerBalance);
    expect(Number(buyerBalance)).to.equal(
      Number(100 * 10 ** decimals) + 1000000
    );
    const sellerBalance = await usdt.balanceOf(Seller.address);
    // console.log("==========sellerBalance:" + sellerBalance);
    expect(Number(sellerBalance)).to.equal(Number(0));
  });

  it("should feesAvailable & withdrawFees StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;
    //  console.log("ammount:"+ammount)

    //transfer
    await usdt.transfer(Buyer.address, ammount);

    //call approve
    await usdt.connect(Buyer).approve(paydeceEscrow.address, ammount);

    await expect(
      paydeceEscrow.connect(other).withdrawFees(usdt.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      paydeceEscrow.connect(owner).withdrawFees(usdt.address)
    ).to.be.revertedWith("Amount > feesAvailable");

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    await paydeceEscrow.connect(Seller).setMarkAsPaid("1");

    //call releaseEscrowOwner
    await paydeceEscrow.connect(owner).releaseEscrowOwner("1");

    const _feesAvailable = await paydeceEscrow
      .connect(owner)
      .feesAvailable(usdt.address);
    // console.log("feesAvailable:" + _feesAvailable);

    const scBalance = await usdt.balanceOf(owner.address);

    // console.log("scBalance:" + scBalance);
    //withdrawFees
    const _releaseEscrowOwner = await paydeceEscrow
      .connect(owner)
      .withdrawFees(usdt.address);

    //get Balance
    const scAfterBalance = await usdt.balanceOf(owner.address);
    // console.log("scAfterBalance:" + scAfterBalance);

    expect(Number(scAfterBalance)).to.equal(
      Number(scBalance) + Number(_feesAvailable)
    );
  });
});

//CancelTakerOwner
describe("PaydeceEscrow StableCoin releaseEscrowOwner", function () {
  it("should releaseEscrowOwner to Seller StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("Address Stable to be whitelisted");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //transfer
    await usdt.transfer(Buyer.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("Taker approve to Escrow first");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address, false, false)
    ).to.be.revertedWith("taker cannot be the same as maker");

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address, true, true)
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrow("1")
    ).to.be.revertedWith("Only Maker can call this");

    //call setMarkAsPaid
    await paydeceEscrow.connect(Seller).setMarkAsPaid("1");

    //call releaseEscrowOwner
    await paydeceEscrow.connect(owner).releaseEscrowOwner("1");

    await expect(
      paydeceEscrow.connect(Seller).setMarkAsPaid("1")
    ).to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    expect(Number(scBalance)).to.equal(Number(1 * 10 ** decimals));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    expect(Number(buyerBalance)).to.equal(Number(0));
    const sellerBalance = await usdt.balanceOf(Seller.address);
    expect(Number(sellerBalance)).to.equal(Number(100 * 10 ** decimals));
  });

  it("should refund to Buyer StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;

    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;

    //transfer
    await usdt.transfer(Buyer.address, ammount + _amountFeeTaker);

    //call approve
    await usdt
      .connect(Buyer)
      .approve(
        paydeceEscrow.address,
        ammount + _amountFeeTaker + _amountFeeTaker
      );

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    //call refundBuyer Error
    await expect(
      paydeceEscrow.connect(other).refundMaker("1")
    ).to.be.revertedWith("Ownable: caller is not the owner");

    //call refundBuyer
    await paydeceEscrow.connect(owner).refundMaker("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    // console.log("==========scBalance:" + scBalance);
    expect(Number(scBalance)).to.equal(Number(0));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    // console.log("==========buyerBalance:" + buyerBalance);
    expect(Number(buyerBalance)).to.equal(
      Number(100 * 10 ** decimals) + 1000000
    );
    const sellerBalance = await usdt.balanceOf(Seller.address);
    // console.log("==========sellerBalance:" + sellerBalance);
    expect(Number(sellerBalance)).to.equal(Number(0));
  });

  it("should feesAvailable & withdrawFees StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;
    //  console.log("ammount:"+ammount)

    //transfer
    await usdt.transfer(Buyer.address, ammount);

    //call approve
    await usdt.connect(Buyer).approve(paydeceEscrow.address, ammount);

    await expect(
      paydeceEscrow.connect(other).withdrawFees(usdt.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      paydeceEscrow.connect(owner).withdrawFees(usdt.address)
    ).to.be.revertedWith("Amount > feesAvailable");

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    await paydeceEscrow.connect(Seller).setMarkAsPaid("1");

    //call releaseEscrowOwner
    await paydeceEscrow.connect(owner).releaseEscrowOwner("1");

    const _feesAvailable = await paydeceEscrow
      .connect(owner)
      .feesAvailable(usdt.address);
    // console.log("feesAvailable:" + _feesAvailable);

    const scBalance = await usdt.balanceOf(owner.address);

    // console.log("scBalance:" + scBalance);
    //withdrawFees
    const _releaseEscrowOwner = await paydeceEscrow
      .connect(owner)
      .withdrawFees(usdt.address);

    //get Balance
    const scAfterBalance = await usdt.balanceOf(owner.address);
    // console.log("scAfterBalance:" + scAfterBalance);

    expect(Number(scAfterBalance)).to.equal(
      Number(scBalance) + Number(_feesAvailable)
    );
  });
});

describe("PaydeceEscrow NativeCoin", function () {
  //NativeCoin

  it("should create a escrow and release NativeCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();
    // console.log(owner.address)

    const initBuyerBalance = await ethers.provider.getBalance(Seller.address);
    const initSellerBalance = await ethers.provider.getBalance(Buyer.address);

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrowNativeCoin("2", Seller.address, ammount, false, false, {
          value: ammount,
        })
    ).to.be.revertedWith("Taker cannot be the same as maker");

    //Error the ammount
    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrowNativeCoin("2", Seller.address, ammount, false, false, {
          value: 0,
        })
    ).to.be.revertedWith("Incorrect amount");

    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, false, false, {
        value: ammount,
      });

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrowNativeCoin("2", Seller.address, ammount, true, true, {
          value: ammount,
        })
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrowNativeCoin("2")
    ).to.be.revertedWith("Only Maker can call this");

    //call releaseEscrow
    await paydeceEscrow.connect(Buyer).releaseEscrowNativeCoin("2");

    await expect(
      paydeceEscrow.connect(Buyer).releaseEscrowNativeCoin("2")
    ).to.be.revertedWith("USDT has not been deposited");

    //get balance SC paydece
    const afterbalanceSC = await ethers.provider.getBalance(
      paydeceEscrow.address
    );
    // console.log("afterbalanceSC:"+afterbalanceSC.toString())
    // 1 is expected because 1% of 100
    expect(Number(afterbalanceSC)).to.equal(
      Number(ethers.utils.parseUnits("1", "ether"))
    );

    buyerBalance = await ethers.provider.getBalance(Buyer.address);
    // console.log("buyerBalance:"+buyerBalance.toString())

    // console.log("ammount:"+ammount)

    sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("sellerBalance:"+sellerBalance.toString())
    // expect(Number(sellerBalance)).to.equal(Number(initSellerBalance)+Number(ethers.utils.parseUnits("99", "ether")));
  });

  it("should releaseEscrowOwnerNativeCoin to Seller NativeCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    let buyerBalance = await ethers.provider.getBalance(Buyer.address);
    // console.log("----------antes buyerBalance:"+buyerBalance.toString())

    let sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("sellerBalance:"+sellerBalance.toString())

    //get balance sc paydece
    const prevBalanceSC = await ethers.provider.getBalance(
      paydeceEscrow.address
    );
    // console.log(prevBalance.toString())

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether
    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, false, false, {
        value: ammount,
      });

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrowOwnerNativeCoin("2")
    ).to.be.revertedWith("Ownable: caller is not the owner");

    //call releaseEscrow
    await paydeceEscrow.connect(owner).releaseEscrowOwnerNativeCoin("2");

    //get balance sc paydece
    const afterbalanceSC = await ethers.provider.getBalance(
      paydeceEscrow.address
    );
    //  console.log("----------afterbalanceSC:"+afterbalanceSC.toString())
    // expect(Number(afterbalanceSC)).to.equal(Number(0));

    sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("----------sellerBalance:"+sellerBalance.toString())

    buyerBalance = await ethers.provider.getBalance(Buyer.address);
    //  console.log("----------buyerBalance:"+buyerBalance.toString())

    // 1 is expected because 1% of 100
    // /expect(Number(afterbalanceSC)).to.equal(Number(ethers.utils.parseUnits("1", "ether")));
    // expect(Number(buyerBalance)).to.be.at.least(Number(ethers.utils.parseUnits("100", "ether")));
  });

  it("should refund to Buyer NativeCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();
    // console.log(owner.address)

    let sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("sellerBalance:"+sellerBalance.toString())

    //get balance sc paydece
    const prevBalanceSC = await ethers.provider.getBalance(
      paydeceEscrow.address
    );
    // console.log(prevBalance.toString())

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether

    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, false, false, {
        value: ammount,
      });

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).refundMakerNativeCoin("2")
    ).to.be.revertedWith("Ownable: caller is not the owner");

    //call releaseEscrow
    await paydeceEscrow.connect(owner).refundMakerNativeCoin("2");

    //get balance sc paydece
    const afterbalanceSC = await ethers.provider.getBalance(
      paydeceEscrow.address
    );

    // console.log("----------afterbalanceSC:"+afterbalanceSC.toString())
    expect(Number(afterbalanceSC)).to.equal(Number(0));

    // sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("sellerBalance:"+sellerBalance.toString())

    // buyerBalance = await ethers.provider.getBalance(Buyer.address);
    // console.log("buyerBalance:"+buyerBalance.toString())

    // 1 is expected because 1% of 100
    // expect(Number(afterbalanceSC)).to.equal(Number(ethers.utils.parseUnits("1", "ether")));

    // expect(Number(buyerBalance)).to.be.at.least(Number(ethers.utils.parseUnits("99", "ether")));
  });

  it("should feesAvailableNativeCoin & withdrawFeesNativeCoin NativeCoin Premium", async function () {
    let PaydeceEscrow, paydeceEscrow;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();
    // console.log(owner.address)

    const initBuyerBalance = await ethers.provider.getBalance(Seller.address);
    const initSellerBalance = await ethers.provider.getBalance(Buyer.address);

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //Error OnlyOwner
    await expect(
      paydeceEscrow.connect(other).withdrawFeesNativeCoin()
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      paydeceEscrow.connect(owner).withdrawFeesNativeCoin()
    ).to.be.revertedWith("Amount > feesAvailable");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether

    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, true, true, {
        value: ammount,
      });

    //call releaseEscrow
    await paydeceEscrow.connect(Buyer).releaseEscrowNativeCoin("2");

    //get balance SC paydece
    const afterbalanceSC = await ethers.provider.getBalance(
      paydeceEscrow.address
    );
    // console.log("afterbalanceSC", Number(afterbalanceSC));

    // console.log("afterbalanceSC:"+afterbalanceSC.toString())
    // 1 is expected because 1% of 100
    expect(Number(afterbalanceSC)).to.equal(Number(0));

    buyerBalance = await ethers.provider.getBalance(Buyer.address);
    // console.log("buyerBalance:"+buyerBalance.toString())

    // console.log("ammount:"+ammount)

    sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("sellerBalance:"+sellerBalance.toString())
    // expect(Number(sellerBalance)).to.equal(Number(initSellerBalance)+Number(ethers.utils.parseUnits("99", "ether")));

    const _feesAvailable = await paydeceEscrow
      .connect(owner)
      .feesAvailableNativeCoin();
    // console.log("_feesAvailable", Number(_feesAvailable));

    const scBalance = await ethers.provider.getBalance(owner.address);
    // console.log("scBalance", Number(scBalance));

    //withdrawFees
    // const _releaseEscrowOwner = await paydeceEscrow
    //   .connect(owner)
    //   .withdrawFeesNativeCoin();

    // const txReceipt = await _releaseEscrowOwner.wait();
    // const effGasPrice = txReceipt.effectiveGasPrice;
    // const txGasUsed = txReceipt.gasUsed;
    // const gasUsedETH = effGasPrice * txGasUsed;
    // console.debug(
    //   "Total Gas USD: " + ethers.utils.formatEther(gasUsedETH.toString()) // exchange rate today
    // );

    //get Balance
    const scAfterBalance = await ethers.provider.getBalance(owner.address);
    // console.log("scAfterBalance:" + scAfterBalance);

    // expect(Number(scAfterBalance)).to.equal(
    //   Number(scBalance) + Number(_feesAvailable) - Number(gasUsedETH)
    // );
  });

  it("should feesAvailableNativeCoin & withdrawFeesNativeCoin NativeCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();
    // console.log(owner.address)

    const initBuyerBalance = await ethers.provider.getBalance(Seller.address);
    const initSellerBalance = await ethers.provider.getBalance(Buyer.address);

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //Error OnlyOwner
    await expect(
      paydeceEscrow.connect(other).withdrawFeesNativeCoin()
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      paydeceEscrow.connect(owner).withdrawFeesNativeCoin()
    ).to.be.revertedWith("Amount > feesAvailable");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether

    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, false, false, {
        value: ammount,
      });

    //call releaseEscrow
    await paydeceEscrow.connect(Buyer).releaseEscrowNativeCoin("2");

    //get balance SC paydece
    const afterbalanceSC = await ethers.provider.getBalance(
      paydeceEscrow.address
    );
    // console.log("afterbalanceSC", Number(afterbalanceSC));

    // console.log("afterbalanceSC:"+afterbalanceSC.toString())
    // 1 is expected because 1% of 100
    // expect(Number(afterbalanceSC)).to.equal(Number(0));

    buyerBalance = await ethers.provider.getBalance(Buyer.address);
    // console.log("buyerBalance:"+buyerBalance.toString())

    // console.log("ammount:"+ammount)

    sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("sellerBalance:"+sellerBalance.toString())
    // expect(Number(sellerBalance)).to.equal(Number(initSellerBalance)+Number(ethers.utils.parseUnits("99", "ether")));

    const _feesAvailable = await paydeceEscrow
      .connect(owner)
      .feesAvailableNativeCoin();
    // console.log("_feesAvailable", Number(_feesAvailable));

    const scBalance = await ethers.provider.getBalance(owner.address);
    // console.log("scBalance", Number(scBalance));

    //withdrawFees
    const _releaseEscrowOwner = await paydeceEscrow
      .connect(owner)
      .withdrawFeesNativeCoin();

    // const txReceipt = await _releaseEscrowOwner.wait();
    // const effGasPrice = txReceipt.effectiveGasPrice;
    // const txGasUsed = txReceipt.gasUsed;
    // const gasUsedETH = effGasPrice * txGasUsed;
    // console.debug(
    //   "Total Gas USD: " + ethers.utils.formatEther(gasUsedETH.toString()) // exchange rate today
    // );

    //get Balance
    const scAfterBalance = await ethers.provider.getBalance(owner.address);
    // console.log("scAfterBalance:" + scAfterBalance);

    // expect(Number(scAfterBalance)).to.equal(
    //   Number(scBalance) + Number(_feesAvailable) - Number(gasUsedETH)
    // );
  });
});

describe("Contract Ownership", () => {
  it("you should transfer Ownership", async () => {
    let PaydeceEscrow, paydeceEscrow;
    const [owner, newOwner] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await paydeceEscrow.transferOwnership(newOwner.address);

    const _owner = await paydeceEscrow.owner();
    // console.log("_owner:" + _owner);
    expect(_owner).to.equal(newOwner.address);
  });

  it("you should renounce Ownership", async () => {
    let PaydeceEscrow, paydeceEscrow;
    //const [owner, newOwner] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await paydeceEscrow.renounceOwnership();

    const _owner = await paydeceEscrow.owner();
    // console.log("_owner:" + _owner);
    expect(_owner).to.equal("0x0000000000000000000000000000000000000000");
  });

  it("should create a escrow and get state equal 1", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");

    //call addStablesAddresses Error
    await expect(
      paydeceEscrow.connect(other).addStablesAddresses(usdt.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;
    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;
    //  console.log("ammount:"+ammount)

    //transfer
    await usdt.transfer(Buyer.address, ammount + _amountFeeTaker);

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    //call getState
    const _state = await paydeceEscrow.getState("1");
    // console.log("_state:" + _state);
    const _FundedState = 2;
    expect(_state).to.equal(_FundedState);
  });

  it("should create a escrow and get value equal 1", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeMaker("1000");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;
    const _amountFeeTaker =
      (ammount * (1000 * 10 ** decimals)) / (100 * 10 ** decimals) / 1000;
    //  console.log("ammount:"+ammount)

    //transfer
    await usdt.transfer(Buyer.address, ammount + _amountFeeTaker);

    //call approve
    await usdt
      .connect(Buyer)
      .approve(paydeceEscrow.address, ammount + _amountFeeTaker);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    //call getState
    // const _value = await paydeceEscrow.getBalance("1");
    // console.log("Paso 9");
    // const _FundedState = 1;
    // expect(_value).to.equal(ammount);
  });

  it("should create a escrow and get Escrow", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeTaker("1000");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;
    //  console.log("ammount:"+ammount)

    //transfer
    await usdt.transfer(Buyer.address, ammount);

    //call approve
    await usdt.connect(Buyer).approve(paydeceEscrow.address, ammount);

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address, false, false);

    //call getState
    const _escrow = await paydeceEscrow.escrows("1");
    // console.table(_escrow);
    // console.log("_escrow.feeTaker:" + _escrow.takerfee);
    // const _FundedState = 1;
    expect(_escrow.taker).to.equal(Seller.address);
    expect(_escrow.maker).to.equal(Buyer.address);
    expect(_escrow.value).to.equal(ammount);
    expect(_escrow.takerfee).to.equal(1000);
    expect(_escrow.makerfee).to.equal(0);
    expect(_escrow.currency).to.equal(usdt.address);
    expect(_escrow.status).to.equal(2);
  });
});

describe("Contract Read Methods", () => {
  it("version should be 4.1.0", async () => {
    let PaydeceEscrow, paydeceEscrow;
    const [owner, newOwner] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    const _verion = await paydeceEscrow.version();

    //console.log("_verion:" + _verion);
    expect(_verion).to.equal("4.1.0");
  });
});
