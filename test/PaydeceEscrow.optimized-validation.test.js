const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaydeceEscrow - Optimized Validation Functions", function () {
  let paydeceEscrow;
  let owner, sender, receiver;

  beforeEach(async function () {
    [owner, sender, receiver] = await ethers.getSigners();
    
    // Deploy PaydeceEscrow
    const PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();
  });

  describe("Individual Scale Validation Functions", function () {
    it("should validate scale2 correctly with _validateScale2", async function () {
      // Test that scale2 validation only checks against scale3
      const currentScale3 = await paydeceEscrow.scale3Percent(); // 100
      
      // Valid: scale2 >= scale3
      await paydeceEscrow.connect(owner).setScale2Percent(150);
      expect(await paydeceEscrow.scale2Percent()).to.equal(150);
      
      // Valid: scale2 == scale3
      await paydeceEscrow.connect(owner).setScale2Percent(currentScale3);
      expect(await paydeceEscrow.scale2Percent()).to.equal(currentScale3);
      
      // Invalid: scale2 < scale3
      await expect(
        paydeceEscrow.connect(owner).setScale2Percent(50)
      ).to.be.reverted;
    });

    it("should validate scale3 correctly with _validateScale3", async function () {
      // Test that scale3 validation checks against scale2 and scale4
      const currentScale2 = await paydeceEscrow.scale2Percent(); // 125
      const currentScale4 = await paydeceEscrow.scale4Percent(); // 75
      
      // Valid: scale2 >= scale3 >= scale4
      await paydeceEscrow.connect(owner).setScale3Percent(100);
      expect(await paydeceEscrow.scale3Percent()).to.equal(100);
      
      // Invalid: scale3 > scale2
      await expect(
        paydeceEscrow.connect(owner).setScale3Percent(150)
      ).to.be.reverted;
      
      // Invalid: scale3 < scale4
      await expect(
        paydeceEscrow.connect(owner).setScale3Percent(50)
      ).to.be.reverted;
    });

    it("should validate scale4 correctly with _validateScale4", async function () {
      // Test that scale4 validation checks against scale3 and scale5
      const currentScale3 = await paydeceEscrow.scale3Percent(); // 100
      const currentScale5 = await paydeceEscrow.scale5Percent(); // 50
      
      // Valid: scale3 >= scale4 >= scale5
      await paydeceEscrow.connect(owner).setScale4Percent(75);
      expect(await paydeceEscrow.scale4Percent()).to.equal(75);
      
      // Invalid: scale4 > scale3
      await expect(
        paydeceEscrow.connect(owner).setScale4Percent(150)
      ).to.be.reverted;
      
      // Invalid: scale4 < scale5
      await expect(
        paydeceEscrow.connect(owner).setScale4Percent(25)
      ).to.be.reverted;
    });

    it("should validate scale5 correctly with _validateScale5", async function () {
      // Test that scale5 validation checks against scale4 and scale6
      const currentScale4 = await paydeceEscrow.scale4Percent(); // 75
      const currentScale6 = await paydeceEscrow.scale6Percent(); // 25
      
      // Valid: scale4 >= scale5 >= scale6
      await paydeceEscrow.connect(owner).setScale5Percent(50);
      expect(await paydeceEscrow.scale5Percent()).to.equal(50);
      
      // Invalid: scale5 > scale4
      await expect(
        paydeceEscrow.connect(owner).setScale5Percent(100)
      ).to.be.reverted;
      
      // Invalid: scale5 < scale6
      await expect(
        paydeceEscrow.connect(owner).setScale5Percent(10)
      ).to.be.reverted;
    });

    it("should validate scale6 correctly with _validateScale6", async function () {
      // Test that scale6 validation checks against scale5 and merchant
      const currentScale5 = await paydeceEscrow.scale5Percent(); // 50
      const currentMerchant = await paydeceEscrow.merchantVerifiedPercent(); // 25
      
      // Valid: scale5 >= scale6 >= merchant
      await paydeceEscrow.connect(owner).setScale6Percent(25);
      expect(await paydeceEscrow.scale6Percent()).to.equal(25);
      
      // Invalid: scale6 > scale5
      await expect(
        paydeceEscrow.connect(owner).setScale6Percent(75)
      ).to.be.reverted;
      
      // Invalid: scale6 < merchant
      await expect(
        paydeceEscrow.connect(owner).setScale6Percent(10)
      ).to.be.reverted;
    });

    it("should validate merchant percent correctly with _validateMerchantPercent", async function () {
      // Test that merchant validation only checks against scale6
      const currentScale6 = await paydeceEscrow.scale6Percent(); // 25
      
      // Valid: scale6 >= merchant
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(25);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(25);
      
      // Valid: merchant < scale6
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(10);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(10);
      
      // Invalid: merchant > scale6
      await expect(
        paydeceEscrow.connect(owner).setMerchantVerifiedPercent(50)
      ).to.be.reverted;
    });
  });

  describe("Gas Optimization Verification", function () {
    it("should use less gas with optimized validation vs full hierarchy validation", async function () {
      // Set up initial state with known values
      await paydeceEscrow.connect(owner).setScale2Percent(125);
      await paydeceEscrow.connect(owner).setScale3Percent(100);
      await paydeceEscrow.connect(owner).setScale4Percent(75);
      await paydeceEscrow.connect(owner).setScale5Percent(50);
      await paydeceEscrow.connect(owner).setScale6Percent(25);
      
      // Test individual scale updates (should use optimized validation)
      const tx1 = await paydeceEscrow.connect(owner).setScale3Percent(110);
      const receipt1 = await tx1.wait();
      
      // The optimized validation should use significantly less gas than
      // the previous full hierarchy validation for individual updates
      console.log(`      Gas used for individual scale update: ${receipt1.gasUsed}`);
      
      // Test batch update (should still use full validation)
      const tx2 = await paydeceEscrow.connect(owner).setAllScales(130, 120, 80, 60, 30);
      const receipt2 = await tx2.wait();
      
      console.log(`      Gas used for batch scale update: ${receipt2.gasUsed}`);
      
      // Individual update should use less gas than batch update
      // (batch needs to validate entire hierarchy, individual only checks neighbors)
      expect(receipt1.gasUsed).to.be.lt(receipt2.gasUsed,
        "Individual update should use less gas than batch update");
    });

    it("should maintain hierarchy integrity after optimized updates", async function () {
      // Reset to default values
      await paydeceEscrow.connect(owner).setAllScales(125, 100, 75, 50, 25);
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(25);
      
      // Perform several individual optimized updates
      await paydeceEscrow.connect(owner).setScale3Percent(90);
      await paydeceEscrow.connect(owner).setScale4Percent(80);
      await paydeceEscrow.connect(owner).setScale5Percent(60);
      
      // Verify hierarchy is still maintained
      const scale2 = await paydeceEscrow.scale2Percent();
      const scale3 = await paydeceEscrow.scale3Percent();
      const scale4 = await paydeceEscrow.scale4Percent();
      const scale5 = await paydeceEscrow.scale5Percent();
      const scale6 = await paydeceEscrow.scale6Percent();
      const merchant = await paydeceEscrow.merchantVerifiedPercent();
      
      expect(scale2).to.be.gte(scale3);
      expect(scale3).to.be.gte(scale4);
      expect(scale4).to.be.gte(scale5);
      expect(scale5).to.be.gte(scale6);
      expect(scale6).to.be.gte(merchant);
      
      console.log(`      Final hierarchy: ${scale2} >= ${scale3} >= ${scale4} >= ${scale5} >= ${scale6} >= ${merchant}`);
    });
  });

  describe("Edge Cases with Optimized Validation", function () {
    it("should handle boundary values correctly", async function () {
      // Test with all fees set to same value using individual functions
      await paydeceEscrow.connect(owner).setScale2Percent(100);
      await paydeceEscrow.connect(owner).setScale3Percent(100);
      await paydeceEscrow.connect(owner).setScale4Percent(100);
      await paydeceEscrow.connect(owner).setScale5Percent(100);
      await paydeceEscrow.connect(owner).setScale6Percent(100);
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(100);
      
      // All should be equal
      expect(await paydeceEscrow.scale2Percent()).to.equal(100);
      expect(await paydeceEscrow.scale3Percent()).to.equal(100);
      expect(await paydeceEscrow.scale4Percent()).to.equal(100);
      expect(await paydeceEscrow.scale5Percent()).to.equal(100);
      expect(await paydeceEscrow.scale6Percent()).to.equal(100);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(100);
    });

    it("should handle zero values correctly", async function () {
      // Set all to zero using individual functions (in reverse order)
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(0);
      await paydeceEscrow.connect(owner).setScale6Percent(0);
      await paydeceEscrow.connect(owner).setScale5Percent(0);
      await paydeceEscrow.connect(owner).setScale4Percent(0);
      await paydeceEscrow.connect(owner).setScale3Percent(0);
      await paydeceEscrow.connect(owner).setScale2Percent(0);
      
      // All should be zero
      expect(await paydeceEscrow.scale2Percent()).to.equal(0);
      expect(await paydeceEscrow.scale3Percent()).to.equal(0);
      expect(await paydeceEscrow.scale4Percent()).to.equal(0);
      expect(await paydeceEscrow.scale5Percent()).to.equal(0);
      expect(await paydeceEscrow.scale6Percent()).to.equal(0);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(0);
    });

    it("should handle maximum values correctly", async function () {
      // Set all to maximum using individual functions
      await paydeceEscrow.connect(owner).setScale2Percent(200);
      await paydeceEscrow.connect(owner).setScale3Percent(200);
      await paydeceEscrow.connect(owner).setScale4Percent(200);
      await paydeceEscrow.connect(owner).setScale5Percent(200);
      await paydeceEscrow.connect(owner).setScale6Percent(200);
      await paydeceEscrow.connect(owner).setMerchantVerifiedPercent(200);
      
      // All should be 200
      expect(await paydeceEscrow.scale2Percent()).to.equal(200);
      expect(await paydeceEscrow.scale3Percent()).to.equal(200);
      expect(await paydeceEscrow.scale4Percent()).to.equal(200);
      expect(await paydeceEscrow.scale5Percent()).to.equal(200);
      expect(await paydeceEscrow.scale6Percent()).to.equal(200);
      expect(await paydeceEscrow.merchantVerifiedPercent()).to.equal(200);
    });
  });

  describe("Batch Functions Still Use Full Validation", function () {
    it("should verify setAllScales still validates complete hierarchy", async function () {
      // This should fail because it breaks hierarchy
      await expect(
        paydeceEscrow.connect(owner).setAllScales(100, 125, 75, 50, 25) // scale3 > scale2
      ).to.be.reverted;
    });

    it("should verify setMultipleScales still validates complete hierarchy", async function () {
      // This should fail because it breaks hierarchy
      await expect(
        paydeceEscrow.connect(owner).setMultipleScales([2, 3], [100, 125]) // scale3 > scale2
      ).to.be.reverted;
    });
  });
});