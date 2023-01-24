const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("setFeeSeller", () => {
  it("should revert with message 'The fee can be from 0% to 1%", async () => {
    let PaydeceEscrow, paydeceEscrow;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await expect(paydeceEscrow.setFeeSeller(1001)).to.be.revertedWith(
      "The fee can be from 0% to 1%"
    );
  });
});

describe("setFeeBuyer", () => {
  it("should revert with message 'The fee can be from 0% to 1%", async () => {
    let PaydeceEscrow, paydeceEscrow;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await expect(paydeceEscrow.setFeeBuyer(1001)).to.be.revertedWith(
      "The fee can be from 0% to 1%"
    );
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
    // console.log(owner.address)

    // let sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("sellerBalance:"+sellerBalance.toString())

    //get balance sc paydece
    // const prevBalanceSC = await ethers.provider.getBalance(paydeceEscrow.address);
    // console.log(prevBalance.toString())

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

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
      .createEscrow("1", Seller.address, ammount, usdt.address);

    //call releaseEscrow
    await paydeceEscrow.connect(Buyer).releaseEscrow("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    expect(Number(scBalance)).to.equal(Number(1 * 10 ** decimals));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    expect(Number(buyerBalance)).to.equal(Number(0));
    const sellerBalance = await usdt.balanceOf(Seller.address);
    expect(Number(sellerBalance)).to.equal(Number(99 * 10 ** decimals));
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

    const [owner, Seller, Buyer] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

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
      .createEscrow("1", Seller.address, ammount, usdt.address);

    //call releaseEscrowOwner
    await paydeceEscrow.connect(owner).releaseEscrowOwner("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    //  console.log("scBalance:"+scBalance)
    expect(Number(scBalance)).to.equal(Number(1 * 10 ** decimals));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    //  console.log("buyerBalance:"+buyerBalance)
    expect(Number(buyerBalance)).to.equal(Number(0));
    const sellerBalance = await usdt.balanceOf(Seller.address);
    //  console.log("sellerBalance:"+sellerBalance)
    expect(Number(sellerBalance)).to.equal(Number(99 * 10 ** decimals));
  });

  it("should feesAvailable StableCoin", async function () {
    let PaydeceEscrow, paydeceEscrow;
    let USDT, usdt;

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Deploy USDT
    USDT = await ethers.getContractFactory("USDTToken");
    usdt = await USDT.deploy();
    await usdt.deployed();

    const [owner, Seller, Buyer] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

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
      .createEscrow("1", Seller.address, ammount, usdt.address);

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

    const [owner, Seller, Buyer] = await ethers.getSigners();

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

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
      .createEscrow("1", Seller.address, ammount, usdt.address);

    //call refundBuyer
    await paydeceEscrow.connect(owner).refundBuyer("1");

    //get Balance
    const scBalance = await usdt.balanceOf(paydeceEscrow.address);
    //  console.log("==========scBalance:"+scBalance)
    expect(Number(scBalance)).to.equal(Number(0));
    const buyerBalance = await usdt.balanceOf(Buyer.address);
    //  console.log("==========buyerBalance:"+buyerBalance)
    expect(Number(buyerBalance)).to.equal(Number(100 * 10 ** decimals));
    const sellerBalance = await usdt.balanceOf(Seller.address);
    //  console.log("==========sellerBalance:"+sellerBalance)
    expect(Number(sellerBalance)).to.equal(Number(0));
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
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether
    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, { value: ammount });

    //call releaseEscrow
    await paydeceEscrow.connect(Buyer).releaseEscrowNativeCoin("2");

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
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether
    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, { value: ammount });

    //call releaseEscrow
    await paydeceEscrow.connect(owner).refundBuyerNativeCoin("2");

    //get balance sc paydece
    const afterbalanceSC = await ethers.provider.getBalance(
      paydeceEscrow.address
    );
    //  console.log("----------afterbalanceSC:"+afterbalanceSC.toString())
    expect(Number(afterbalanceSC)).to.equal(Number(0));

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
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether
    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, { value: ammount });

    //call releaseEscrow
    await paydeceEscrow.connect(owner).refundBuyerNativeCoin("2");

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
});
