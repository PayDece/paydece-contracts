const { expect } = require("chai");
const { ethers, providers } = require("hardhat");

describe("setFeeSeller", () => {
  it("should 1%", async () => {
    let PaydeceEscrow, paydeceEscrow;
    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await paydeceEscrow.setFeeSeller(1);

    const feeBuyer = await paydeceEscrow.feeSeller();

    expect(Number(feeBuyer)).to.equal(Number(1));

    await expect(
      paydeceEscrow.connect(other).setFeeSeller("1000")
    ).to.be.revertedWith("caller is not the owner");
  });

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
    const [owner, Seller, Buyer, other] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    await expect(paydeceEscrow.setFeeBuyer(1001)).to.be.revertedWith(
      "The fee can be from 0% to 1%"
    );

    await expect(
      paydeceEscrow.connect(other).setFeeBuyer(1)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await paydeceEscrow.setFeeBuyer(1);
    const feeBuyer = await paydeceEscrow.feeBuyer();
    expect(Number(feeBuyer)).to.equal(Number(1));
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
    // console.log(owner.address)

    // let sellerBalance = await ethers.provider.getBalance(Seller.address);
    // console.log("sellerBalance:"+sellerBalance.toString())

    //get balance sc paydece
    // const prevBalanceSC = await ethers.provider.getBalance(paydeceEscrow.address);
    // console.log(prevBalance.toString())

    //Set Fee to 1%
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

    //Set amount
    const decimals = await usdt.connect(Buyer).decimals();
    const ammount = 100 * 10 ** decimals;
    //  console.log("ammount:"+ammount)

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address)
    ).to.be.revertedWith("Address Stable to be whitelisted");

    //call addStablesAddresses
    await paydeceEscrow.connect(owner).addStablesAddresses(usdt.address);

    //transfer
    await usdt.transfer(Buyer.address, ammount);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address)
    ).to.be.revertedWith("Seller approve to Escrow first");

    //call approve
    await usdt.connect(Buyer).approve(paydeceEscrow.address, ammount);

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrow("1", Seller.address, ammount, usdt.address)
    ).to.be.revertedWith("seller cannot be the same as buyer");

    //call createEscrow
    await paydeceEscrow
      .connect(Buyer)
      .createEscrow("1", Seller.address, ammount, usdt.address);

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrow("1", Seller.address, ammount, usdt.address)
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrow("1")
    ).to.be.revertedWith("Only Buyer can call this");

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

    const [owner, Seller, Buyer, other] = await ethers.getSigners();

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

    //call releaseEscrowOwner Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrowOwner("1")
    ).to.be.revertedWith("Ownable: caller is not the owner");

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

    //call refundBuyer Error
    await expect(
      paydeceEscrow.connect(other).refundBuyer("1")
    ).to.be.revertedWith("Ownable: caller is not the owner");

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

    await expect(
      paydeceEscrow.connect(other).withdrawFees(usdt.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      paydeceEscrow.connect(owner).withdrawFees(usdt.address)
    ).to.be.revertedWith("Amount > feesAvailable");

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

    await expect(
      paydeceEscrow
        .connect(Seller)
        .createEscrowNativeCoin("2", Seller.address, ammount, {
          value: ammount,
        })
    ).to.be.revertedWith("seller cannot be the same as buyer");

    //Error the ammount
    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrowNativeCoin("2", Seller.address, ammount, {
          value: 0,
        })
    ).to.be.revertedWith("Incorrect amount");

    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, { value: ammount });

    await expect(
      paydeceEscrow
        .connect(Buyer)
        .createEscrowNativeCoin("2", Seller.address, ammount, {
          value: ammount,
        })
    ).to.be.revertedWith("Escrow already exists");

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).releaseEscrowNativeCoin("2")
    ).to.be.revertedWith("Only Buyer can call this");

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
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

    //call createEscrow
    const ammount = ethers.utils.parseUnits("100", "ether"); //1 ether
    await paydeceEscrow
      .connect(Buyer)
      .createEscrowNativeCoin("2", Seller.address, ammount, { value: ammount });

    //call releaseEscrow Error
    await expect(
      paydeceEscrow.connect(other).refundBuyerNativeCoin("2")
    ).to.be.revertedWith("Ownable: caller is not the owner");

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
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

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

    const _feesAvailable = await paydeceEscrow
      .connect(owner)
      .feesAvailableNativeCoin();

    const scBalance = await ethers.provider.getBalance(owner.address);
    //withdrawFees
    const _releaseEscrowOwner = await paydeceEscrow
      .connect(owner)
      .withdrawFeesNativeCoin();

    const txReceipt = await _releaseEscrowOwner.wait();
    const effGasPrice = txReceipt.effectiveGasPrice;
    const txGasUsed = txReceipt.gasUsed;
    const gasUsedETH = effGasPrice * txGasUsed;
    // console.debug(
    //   "Total Gas USD: " + ethers.utils.formatEther(gasUsedETH.toString()) // exchange rate today
    // );

    //get Balance
    const scAfterBalance = await ethers.provider.getBalance(owner.address);
    // console.log("scAfterBalance:" + scAfterBalance);

    expect(Number(scAfterBalance)).to.equal(
      Number(scBalance) + Number(_feesAvailable) - Number(gasUsedETH)
    );
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
    await paydeceEscrow.connect(owner).setFeeSeller("1000");

    //call addStablesAddresses Error
    await expect(
      paydeceEscrow.connect(other).addStablesAddresses(usdt.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

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

    //call getState
    const _state = await paydeceEscrow.getState("1");
    // console.log("_state:" + _state);
    const _FundedState = 1;
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

    //call getState
    const _value = await paydeceEscrow.getValue("1");
    //console.table(_state);
    // const _FundedState = 1;
    expect(_value).to.equal(ammount);
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

    //call getState
    const _escrow = await paydeceEscrow.escrows("1");
    // console.table(_escrow);
    // console.debug("_escrow.Buyer:" + _escrow.buyer);
    // const _FundedState = 1;
    expect(_escrow.buyer).to.equal(Buyer.address);
    expect(_escrow.seller).to.equal(Seller.address);
    expect(_escrow.value).to.equal(ammount);
    expect(_escrow.sellerfee).to.equal(1000);
    expect(_escrow.buyerfee).to.equal(0);
    expect(_escrow.currency).to.equal(usdt.address);
    expect(_escrow.status).to.equal(1);
  });
});

describe("Contract Read Methods", () => {
  it("version should be 3.0.0", async () => {
    let PaydeceEscrow, paydeceEscrow;
    const [owner, newOwner] = await ethers.getSigners();

    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    const _verion = await paydeceEscrow.version();

    //console.log("_verion:" + _verion);
    expect(_verion).to.equal("3.0.0");
  });
});
