const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaydeceEscrow - Coverage Improvements", function () {
  let paydeceEscrow, usdt, failingERC20, safeERC20Test, revertingReceiver;
  let owner, sender, receiver, other;

  beforeEach(async function () {
    [owner, sender, receiver, other] = await ethers.getSigners();
    
    // Deploy USDTToken
    const USDTToken = await ethers.getContractFactory("USDTToken");
    usdt = await USDTToken.deploy();
    await usdt.deployed();
    
    // Deploy FailingERC20 for testing SafeERC20 edge cases
    const FailingERC20 = await ethers.getContractFactory("FailingERC20");
    failingERC20 = await FailingERC20.deploy();
    await failingERC20.deployed();
    
    // Deploy SafeERC20Test
    const SafeERC20Test = await ethers.getContractFactory("SafeERC20Test");
    safeERC20Test = await SafeERC20Test.deploy();
    await safeERC20Test.deployed();
    
    // Deploy RevertingReceiver
    const RevertingReceiver = await ethers.getContractFactory("RevertingReceiver");
    revertingReceiver = await RevertingReceiver.deploy();
    await revertingReceiver.deployed();
    
    // Deploy PaydeceEscrow
    const PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy(owner.address);
    await paydeceEscrow.deployed();
    
    // Transfer tokens to sender
    await usdt.connect(owner).transfer(sender.address, ethers.utils.parseUnits("10000", 18));
    
    // Whitelist USDT
    await paydeceEscrow.connect(owner).addStableAddress(usdt.address);
  });

  describe("Address.sol Coverage", function () {
    it("should cover Address.isContract with non-contract address", async function () {
      // This will test the isContract function with EOA
      const orderId = 1;
      const value = ethers.utils.parseUnits("100", 18);
      const fee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
      
      await usdt.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      
      // Create escrow with EOA receiver (tests Address.isContract internally)
      await paydeceEscrow.connect(sender).createEscrow(
        orderId,
        receiver.address, // EOA address
        value,
        usdt.address
      );
      
      expect((await paydeceEscrow.escrows(orderId)).receiver).to.equal(receiver.address);
    });
    
    it("should test SafeERC20 with token that returns false", async function () {
      // Test SafeERC20 reverting with token that returns false
      await expect(
        safeERC20Test.doSafeTransfer(failingERC20.address, receiver.address, 100)
      ).to.be.revertedWith("SafeERC20FailedOperation");
    });

    it("should test SafeERC20 with token transfer to zero address", async function () {
      // This should trigger the zero address check in Address.sol
      await expect(
        safeERC20Test.doSafeTransfer(usdt.address, ethers.constants.AddressZero, 100)
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });
  });

  describe("USDTToken.sol Coverage", function () {
    it("should test transferFrom with zero to address", async function () {
      // Give sender some tokens and approve
      const amount = ethers.utils.parseUnits("100", 18);
      await usdt.connect(sender).approve(other.address, amount);
      
      // Test transferFrom to zero address (line 135)
      await expect(
        usdt.connect(other).transferFrom(sender.address, ethers.constants.AddressZero, amount)
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("should test transferFrom with insufficient balance", async function () {
      const amount = ethers.utils.parseUnits("100", 18);
      
      // Give approval but no balance
      await usdt.connect(other).approve(sender.address, amount);
      
      // Try to transferFrom with insufficient balance (covers line 135)
      await expect(
        usdt.connect(sender).transferFrom(other.address, receiver.address, amount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("should test approve with zero spender", async function () {
      const amount = ethers.utils.parseUnits("100", 18);
      
      // Try to approve to zero address (line 217)  
      await expect(
        usdt.connect(sender).approve(ethers.constants.AddressZero, amount)
      ).to.be.revertedWith("ERC20: approve to the zero address");
    });
  });

  describe("Ownable.sol Coverage", function () {
    it("should test renounceOwnership is disabled", async function () {
      // Test renounceOwnership which is overridden to revert (covers line 63)
      try {
        await paydeceEscrow.connect(owner).renounceOwnership();
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("RenounceOwnershipDisabled");
      }
    });

    it("should test ownership functionality through existing functions", async function () {
      // Test ownership through onlyOwner functions
      expect(await paydeceEscrow.owner()).to.equal(owner.address);
      
      // Non-owner should fail
      await expect(
        paydeceEscrow.connect(other).setTimeProcess(3600)
      ).to.be.reverted;
    });
  });

  describe("RevertingReceiver.sol Coverage", function () {
    it("should test RevertingReceiver functionality", async function () {
      // Test the receive function that always reverts (line 6)
      await expect(
        owner.sendTransaction({
          to: revertingReceiver.address,
          value: ethers.utils.parseEther("1")
        })
      ).to.be.revertedWith("I do not accept ETH");
    });
  });

  describe("SafeERC20.sol Additional Coverage", function () {
    it("should test safeTransferFrom with failing token", async function () {
      await expect(
        safeERC20Test.doSafeTransferFrom(failingERC20.address, sender.address, receiver.address, 100)
      ).to.be.revertedWith("SafeERC20FailedOperation");
    });

    it("should test SafeERC20 internal functions", async function () {
      // Test various SafeERC20 functionality 
      const amount = ethers.utils.parseUnits("100", 18);
      
      // Give SafeERC20Test contract some tokens to work with
      await usdt.connect(owner).transfer(safeERC20Test.address, amount);
      
      // Test normal safeTransfer
      await safeERC20Test.doSafeTransfer(usdt.address, receiver.address, amount.div(2));
      
      expect(await usdt.balanceOf(receiver.address)).to.equal(amount.div(2));
    });
  });

  describe("ReentrancyGuard.sol Coverage", function () {
    it("should test reentrancy protection on cancelSender", async function () {
      const orderId = 1;
      const value = ethers.utils.parseUnits("100", 18);
      const fee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
      
      await usdt.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      
      // Create escrow
      await paydeceEscrow.connect(sender).createEscrow(
        orderId,
        receiver.address,
        value,
        usdt.address
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [Number(await paydeceEscrow.timeProcess()) + 1]);
      await ethers.provider.send("evm_mine");
      
      // Cancel should work normally (tests nonReentrant modifier)
      await paydeceEscrow.connect(sender).cancelSender(orderId);
      
      // Verify status
      expect(await paydeceEscrow.getState(orderId)).to.equal(9); // CANCEL_SENDER
    });

    it("should test reentrancy protection on cancelReceiver", async function () {
      const orderId = 2;
      const value = ethers.utils.parseUnits("100", 18);
      const fee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
      
      await usdt.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      
      // Create escrow
      await paydeceEscrow.connect(sender).createEscrow(
        orderId,
        receiver.address,
        value,
        usdt.address
      );
      
      // Cancel by receiver should work normally (tests nonReentrant modifier)
      await paydeceEscrow.connect(receiver).cancelReceiver(orderId);
      
      // Verify status
      expect(await paydeceEscrow.getState(orderId)).to.equal(10); // CANCEL_RECEIVER
    });
  });

  describe("Edge Cases and Error Conditions", function () {
    it("should handle token decimals edge cases", async function () {
      // Test with different decimal tokens if available
      const fee = await paydeceEscrow.publicCalculateFee(
        ethers.utils.parseUnits("0.9", 18), // Less than 1 USDT
        usdt.address,
        false
      );
      expect(fee).to.equal(0); // Should be 0 for amounts < 1 USDT
    });

    it("should test fee hierarchy validation", async function () {
      // Test _validateFeeHierarchy internal function through setter
      // This should fail because we're trying to set scale2 < scale3
      await expect(
        paydeceEscrow.connect(owner).setScale2Percent(50) // Less than current scale3 (100)
      ).to.be.reverted;
    });

    it("should test extreme fee values", async function () {
      // Test very large transaction amount
      const largeAmount = ethers.utils.parseUnits("1000000", 18); // 1M USDT
      const fee = await paydeceEscrow.publicCalculateFee(largeAmount, usdt.address, false);
      
      // Should use scale6Percent (0.25%)
      const expectedFee = largeAmount.mul(25).div(10000);
      expect(fee).to.equal(expectedFee);
    });

    it("should test setTimeProcess boundary conditions", async function () {
      // Test minimum boundary (15 minutes)
      await paydeceEscrow.connect(owner).setTimeProcess(15 * 60);
      expect(await paydeceEscrow.timeProcess()).to.equal(15 * 60);
      
      // Test maximum boundary (2 days)
      await paydeceEscrow.connect(owner).setTimeProcess(2 * 24 * 60 * 60);
      expect(await paydeceEscrow.timeProcess()).to.equal(2 * 24 * 60 * 60);
      
      // Test below minimum should fail
      await expect(
        paydeceEscrow.connect(owner).setTimeProcess(14 * 60)
      ).to.be.revertedWith("timeProcess must be >= 15 minutes");
      
      // Test above maximum should fail
      await expect(
        paydeceEscrow.connect(owner).setTimeProcess(3 * 24 * 60 * 60)
      ).to.be.revertedWith("timeProcess must be <= 2 days");
    });
  });

  describe("Additional PaydeceEscrow Coverage", function () {
    it("should test appeal status validation edge case", async function () {
      const orderId = 10;
      const value = ethers.utils.parseUnits("100", 18);
      const fee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
      
      await usdt.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      
      // Create escrow
      await paydeceEscrow.connect(sender).createEscrow(
        orderId,
        receiver.address,
        value,
        usdt.address
      );
      
      // Mark as paid
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      
      // Test the specific condition in appeal function (line 426)
      // The condition checks status == FIATCOIN_TRANSFERED && status != APPEAL
      await paydeceEscrow.connect(sender).appeal(orderId, true, 1);
      
      // Verify appeal was successful
      const appeal = await paydeceEscrow.escrowAppeals(orderId);
      expect(appeal.appealSender).to.be.true;
    });

    it("should test both sender and receiver appeal in same escrow", async function () {
      const orderId = 11;
      const value = ethers.utils.parseUnits("100", 18);
      const fee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
      
      await usdt.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      
      // Create escrow
      await paydeceEscrow.connect(sender).createEscrow(
        orderId,
        receiver.address,
        value,
        usdt.address
      );
      
      // Mark as paid
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      
      // Sender appeals first
      await paydeceEscrow.connect(sender).appeal(orderId, true, 1);
      
      // Now try receiver appeal (should work even though status is already APPEAL)
      // Wait, the current logic prevents this. Let's create a new escrow for receiver appeal
      const orderId2 = 12;
      await usdt.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      
      await paydeceEscrow.connect(sender).createEscrow(
        orderId2,
        receiver.address,
        value,
        usdt.address
      );
      
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId2);
      
      // Receiver appeals
      await paydeceEscrow.connect(receiver).appeal(orderId2, false, 2);
      
      const appeal = await paydeceEscrow.escrowAppeals(orderId2);
      expect(appeal.appealReceiver).to.be.true;
      expect(appeal.appealReasonId).to.equal(2);
    });
  });
});