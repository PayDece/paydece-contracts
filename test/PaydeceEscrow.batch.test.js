const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaydeceEscrow - Batch Scale Operations", function () {
  let paydeceEscrow;
  let usdtToken;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy USDT token
    const USDTToken = await ethers.getContractFactory("USDTToken");
    usdtToken = await USDTToken.deploy();
    await usdtToken.deployed();

    // Deploy PaydeceEscrow
    const PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();
  });

  describe("setAllScales function", function () {
    it("should set all scales correctly", async function () {
      await paydeceEscrow.connect(owner).setAllScales(120, 100, 80, 60, 40);

      expect(await paydeceEscrow.scale2Percent()).to.equal(120);
      expect(await paydeceEscrow.scale3Percent()).to.equal(100);
      expect(await paydeceEscrow.scale4Percent()).to.equal(80);
      expect(await paydeceEscrow.scale5Percent()).to.equal(60);
      expect(await paydeceEscrow.scale6Percent()).to.equal(40);
    });

    it("should emit all scale update events", async function () {
      const tx = await paydeceEscrow.connect(owner).setAllScales(120, 100, 80, 60, 40);
      
      await expect(tx).to.emit(paydeceEscrow, "Scale2PercentUpdated").withArgs(125, 120);
      await expect(tx).to.emit(paydeceEscrow, "Scale3PercentUpdated").withArgs(100, 100);
      await expect(tx).to.emit(paydeceEscrow, "Scale4PercentUpdated").withArgs(75, 80);
      await expect(tx).to.emit(paydeceEscrow, "Scale5PercentUpdated").withArgs(50, 60);
      await expect(tx).to.emit(paydeceEscrow, "Scale6PercentUpdated").withArgs(25, 40);
    });

    it("should revert if any scale value > 200", async function () {
      await expect(
        paydeceEscrow.connect(owner).setAllScales(201, 100, 80, 60, 40)
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setAllScales(120, 201, 80, 60, 40)
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setAllScales(120, 100, 201, 60, 40)
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setAllScales(120, 100, 80, 201, 40)
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setAllScales(120, 100, 80, 60, 201)
      ).to.be.reverted;
    });

    it("should revert if hierarchy is invalid", async function () {
      await expect(
        paydeceEscrow.connect(owner).setAllScales(100, 120, 80, 60, 40)
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setAllScales(120, 80, 100, 60, 40)
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setAllScales(120, 100, 60, 80, 40)
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setAllScales(120, 100, 80, 40, 60)
      ).to.be.reverted;
    });

    it("should revert if merchant percent > scale6", async function () {
      // Try to set scale6 below current merchant (20 < 25, default merchant is 25)
      await expect(
        paydeceEscrow.connect(owner).setAllScales(120, 100, 80, 60, 20)
      ).to.be.reverted;
    });

    it("should only be callable by owner", async function () {
      await expect(
        paydeceEscrow.connect(user1).setAllScales(120, 100, 80, 60, 40)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setMultipleScales function", function () {
    it("should set multiple scales correctly", async function () {
      await paydeceEscrow.connect(owner).setMultipleScales([2, 4, 6], [120, 80, 40]);

      expect(await paydeceEscrow.scale2Percent()).to.equal(120);
      expect(await paydeceEscrow.scale3Percent()).to.equal(100); // unchanged
      expect(await paydeceEscrow.scale4Percent()).to.equal(80);
      expect(await paydeceEscrow.scale5Percent()).to.equal(50); // unchanged
      expect(await paydeceEscrow.scale6Percent()).to.equal(40);
    });

    it("should emit events for changed scales only", async function () {
      const tx = await paydeceEscrow.connect(owner).setMultipleScales([2, 4], [120, 80]);
      
      await expect(tx).to.emit(paydeceEscrow, "Scale2PercentUpdated").withArgs(125, 120);
      await expect(tx).to.emit(paydeceEscrow, "Scale4PercentUpdated").withArgs(75, 80);
    });

    it("should revert if arrays have different lengths", async function () {
      await expect(
        paydeceEscrow.connect(owner).setMultipleScales([2, 4, 6], [120, 80])
      ).to.be.reverted;
    });

    it("should revert if arrays are empty", async function () {
      await expect(
        paydeceEscrow.connect(owner).setMultipleScales([], [])
      ).to.be.reverted;
    });

    it("should revert if invalid scale ID", async function () {
      await expect(
        paydeceEscrow.connect(owner).setMultipleScales([1], [120])
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setMultipleScales([7], [120])
      ).to.be.reverted;
    });

    it("should revert if any value > 200", async function () {
      await expect(
        paydeceEscrow.connect(owner).setMultipleScales([2, 4], [120, 201])
      ).to.be.reverted;
    });

    it("should revert if resulting hierarchy is invalid", async function () {
      await expect(
        paydeceEscrow.connect(owner).setMultipleScales([2, 3], [80, 120])
      ).to.be.reverted;
    });

    it("should handle single scale update", async function () {
      await paydeceEscrow.connect(owner).setMultipleScales([3], [90]);
      expect(await paydeceEscrow.scale3Percent()).to.equal(90);
    });

    it("should only be callable by owner", async function () {
      await expect(
        paydeceEscrow.connect(user1).setMultipleScales([2], [120])
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Custom errors coverage", function () {
    it("should test all InvalidFeeHierarchy error types", async function () {
      // Type 1: Scale2 < Scale3
      await expect(
        paydeceEscrow.connect(owner).setScale2Percent(50)
      ).to.be.reverted;

      // Type 2: Scale3 < Scale4
      await expect(
        paydeceEscrow.connect(owner).setScale3Percent(50)
      ).to.be.reverted;

      // Type 3: Scale4 < Scale5
      await expect(
        paydeceEscrow.connect(owner).setScale4Percent(40)
      ).to.be.reverted;

      // Type 4: Scale5 < Scale6
      await expect(
        paydeceEscrow.connect(owner).setScale5Percent(20)
      ).to.be.reverted;

      // Type 5: Scale6 < Merchant
      await expect(
        paydeceEscrow.connect(owner).setScale6Percent(20)
      ).to.be.reverted;
    });

    it("should test InvalidScaleValue error", async function () {
      await expect(
        paydeceEscrow.connect(owner).setScale2Percent(201)
      ).to.be.reverted;

      await expect(
        paydeceEscrow.connect(owner).setMerchantVerifiedPercent(201)
      ).to.be.reverted;
    });
  });

  describe("Gas optimization validation", function () {
    it("should use less gas for batch operations", async function () {
      // Individual operations
      const tx1 = await paydeceEscrow.connect(owner).setScale2Percent(120);
      const tx2 = await paydeceEscrow.connect(owner).setScale3Percent(110);
      const tx3 = await paydeceEscrow.connect(owner).setScale4Percent(90);
      const tx4 = await paydeceEscrow.connect(owner).setScale5Percent(70);
      const tx5 = await paydeceEscrow.connect(owner).setScale6Percent(50);

      const individualGas = (await tx1.wait()).gasUsed
        .add((await tx2.wait()).gasUsed)
        .add((await tx3.wait()).gasUsed)
        .add((await tx4.wait()).gasUsed)
        .add((await tx5.wait()).gasUsed);

      // Reset values
      await paydeceEscrow.connect(owner).setAllScales(125, 100, 75, 50, 25);

      // Batch operation
      const batchTx = await paydeceEscrow.connect(owner).setAllScales(120, 110, 90, 70, 50);
      const batchGas = (await batchTx.wait()).gasUsed;

      console.log(`Individual operations gas: ${individualGas.toString()}`);
      console.log(`Batch operation gas: ${batchGas.toString()}`);
      console.log(`Gas savings: ${individualGas.sub(batchGas).toString()} (${Math.round((1 - batchGas.toNumber() / individualGas.toNumber()) * 100)}%)`);

      // Batch should use significantly less gas
      expect(batchGas.toNumber()).to.be.lessThan(individualGas.toNumber() * 0.7); // At least 30% savings
    });
  });
});