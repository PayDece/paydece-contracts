const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaydeceEscrow - Fee Hierarchy Validation", function () {
  let paydeceEscrow;
  let owner, sender, receiver;

  beforeEach(async function () {
    [owner, sender, receiver] = await ethers.getSigners();
    
    // Deploy PaydeceEscrow
    const PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();
  });

  describe("_validateFeeHierarchy internal function coverage", function () {
    it("should revert setScale2Percent if it breaks hierarchy with scale3", async function () {
      // Current scale3Percent is 100 (1%)
      // Try to set scale2Percent to 50 (0.5%) which is less than scale3
      await expect(
        paydeceEscrow.connect(owner).setScale2Percent(50)
      ).to.be.revertedWith("Scale2 must be >= Scale3");
    });

    it("should revert setScale3Percent if it breaks hierarchy with scale4", async function () {
      // Current scale4Percent is 75 (0.75%)
      // Try to set scale3Percent to 50 (0.5%) which is less than scale4
      await expect(
        paydeceEscrow.connect(owner).setScale3Percent(50)
      ).to.be.revertedWith("Scale3 must be >= Scale4");
    });

    it("should revert setScale4Percent if it breaks hierarchy with scale5", async function () {
      // Current scale5Percent is 50 (0.5%)
      // Try to set scale4Percent to 25 (0.25%) which is less than scale5
      await expect(
        paydeceEscrow.connect(owner).setScale4Percent(25)
      ).to.be.revertedWith("Scale4 must be >= Scale5");
    });

    it("should revert setScale5Percent if it breaks hierarchy with scale6", async function () {
      // Current scale6Percent is 25 (0.25%)
      // Try to set scale5Percent to 10 (0.1%) which is less than scale6
      await expect(
        paydeceEscrow.connect(owner).setScale5Percent(10)
      ).to.be.revertedWith("Scale5 must be >= Scale6");
    });

    it("should revert setScale6Percent if it breaks hierarchy with merchant", async function () {
      // Current merchantVerifiedPercent is 25 (0.25%)
      // Try to set scale6Percent to 10 (0.1%) which is less than merchant
      await expect(
        paydeceEscrow.connect(owner).setScale6Percent(10)
      ).to.be.revertedWith("Scale6 must be >= MerchantPercent");
    });

    it("should revert setMerchantVerifiedPercent if it breaks hierarchy with scale5", async function () {
      // Current scale5Percent is 50 (0.5%), scale6Percent is 25 (0.25%)
      // Try to set merchantVerifiedPercent to 100 (1%) which is greater than both scale5 and scale6
      // It will fail with scale6 error first since it's checked before scale5
      await expect(
        paydeceEscrow.connect(owner).setMerchantVerifiedPercent(100)
      ).to.be.revertedWith("Scale6 must be >= MerchantPercent");
    });

    it("should revert setMerchantVerifiedPercent if it breaks hierarchy with scale6", async function () {
      // Current scale6Percent is 25 (0.25%)
      // Try to set merchantVerifiedPercent to 50 (0.5%) which is greater than scale6
      await expect(
        paydeceEscrow.connect(owner).setMerchantVerifiedPercent(50)
      ).to.be.revertedWith("Scale6 must be >= MerchantPercent");
    });

    it("should allow valid fee hierarchy adjustments", async function () {
      // Test that we can set fees in a valid hierarchy
      // Set from highest to lowest to maintain hierarchy
      
      // Set scale2 to 150 (1.5%)
      await paydeceEscrow.connect(owner).setScale2Percent(150);
      expect(await paydeceEscrow.scale2Percent()).to.equal(150);
      
      // Set scale3 to 125 (1.25%)
      await paydeceEscrow.connect(owner).setScale3Percent(125);
      expect(await paydeceEscrow.scale3Percent()).to.equal(125);
      
      // Set scale4 to 100 (1%)
      await paydeceEscrow.connect(owner).setScale4Percent(100);
      expect(await paydeceEscrow.scale4Percent()).to.equal(100);
      
      // Set scale5 to 75 (0.75%)
      await paydeceEscrow.connect(owner).setScale5Percent(75);
      expect(await paydeceEscrow.scale5Percent()).to.equal(75);
      
      // Set scale6 to 50 (0.5%)
      await paydeceEscrow.connect(owner).setScale6Percent(50);
      expect(await paydeceEscrow.scale6Percent()).to.equal(50);
      
      // Set merchant to 25 (0.25%)
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(25);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(25);
    });

    it("should allow equal values in fee hierarchy", async function () {
      // Test that equal values are allowed (>= condition)
      
      // Set all scales to the same value (100 = 1%)
      await paydeceEscrow.connect(owner).setScale2Percent(100);
      await paydeceEscrow.connect(owner).setScale3Percent(100);
      await paydeceEscrow.connect(owner).setScale4Percent(100);
      await paydeceEscrow.connect(owner).setScale5Percent(100);
      await paydeceEscrow.connect(owner).setScale6Percent(100);
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(100);
      
      // Verify all are set correctly
      expect(await paydeceEscrow.scale2Percent()).to.equal(100);
      expect(await paydeceEscrow.scale3Percent()).to.equal(100);
      expect(await paydeceEscrow.scale4Percent()).to.equal(100);
      expect(await paydeceEscrow.scale5Percent()).to.equal(100);
      expect(await paydeceEscrow.scale6Percent()).to.equal(100);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(100);
    });

    it("should test minimum boundary (0 values)", async function () {
      // Test setting all fees to 0 (should work as hierarchy is 0 >= 0)
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(0);
      await paydeceEscrow.connect(owner).setScale6Percent(0);
      await paydeceEscrow.connect(owner).setScale5Percent(0);
      await paydeceEscrow.connect(owner).setScale4Percent(0);
      await paydeceEscrow.connect(owner).setScale3Percent(0);
      await paydeceEscrow.connect(owner).setScale2Percent(0);
      
      // Verify all are set to 0
      expect(await paydeceEscrow.scale2Percent()).to.equal(0);
      expect(await paydeceEscrow.scale3Percent()).to.equal(0);
      expect(await paydeceEscrow.scale4Percent()).to.equal(0);
      expect(await paydeceEscrow.scale5Percent()).to.equal(0);
      expect(await paydeceEscrow.scale6Percent()).to.equal(0);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(0);
    });

    it("should test maximum boundary (200 values)", async function () {
      // Test setting all fees to maximum value (200 = 2%)
      await paydeceEscrow.connect(owner).setScale2Percent(200);
      await paydeceEscrow.connect(owner).setScale3Percent(200);
      await paydeceEscrow.connect(owner).setScale4Percent(200);
      await paydeceEscrow.connect(owner).setScale5Percent(200);
      await paydeceEscrow.connect(owner).setScale6Percent(200);
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(200);
      
      // Verify all are set to 200
      expect(await paydeceEscrow.scale2Percent()).to.equal(200);
      expect(await paydeceEscrow.scale3Percent()).to.equal(200);
      expect(await paydeceEscrow.scale4Percent()).to.equal(200);
      expect(await paydeceEscrow.scale5Percent()).to.equal(200);
      expect(await paydeceEscrow.scale6Percent()).to.equal(200);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(200);
    });
  });
});