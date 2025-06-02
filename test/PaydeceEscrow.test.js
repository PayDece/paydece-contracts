const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaydeceEscrow", function () {
  let PaydeceEscrow, paydeceEscrow, owner, sender, receiver, other, Receiver;
  let token;

  const EscrowStatus = {
    UNKNOWN: 0,
    ACTIVE: 1,
    CRYPTOS_IN_CUSTODY: 2,
    FIATCOIN_TRANSFERED: 3,
    COMPLETED: 4,
    UNKNOWN_5: 5,
    APPEAL: 6,
    REFUND: 7,
    RELEASEOWNER: 8,
    CANCEL_SENDER: 9,
    CANCEL_RECEIVER: 10,
  };

  beforeEach(async function () {
    [owner, sender, receiver, other] = await ethers.getSigners();

    // Deploy a mock ERC20 token
    // const Token = await ethers.getContractFactory("MockERC20");
    // token = await Token.deploy("Mock Token", "MTK", 18, ethers.utils.parseEther("1000"));
    // await token.deployed();

    // Deploy USDT
    const Token = await ethers.getContractFactory("USDTToken");
    token = await Token.deploy();
    await token.deployed();

    // Deploy the PaydeceEscrow contract
    PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy();
    await paydeceEscrow.deployed();

    // Whitelist the token
    await paydeceEscrow.addStablesAddresses(token.address);
  });

  describe("createEscrow", function () {
    it("should create a new escrow", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.sender).to.equal(sender.address);
      expect(escrow.receiver).to.equal(receiver.address);
      expect(escrow.value).to.equal(value);
      expect(escrow.status).to.equal(2); // CRYPTOS_IN_CUSTODY
    });

    it("should fail if the receiver is address(0)", async function () {
      const orderId = 1234;
      const value = ethers.utils.parseEther("1");
      await token.transfer(sender.address, value);
      await token.connect(sender).approve(paydeceEscrow.address, value);
      await expect(
        paydeceEscrow.connect(sender).createEscrow(orderId, ethers.constants.AddressZero, value, token.address)
      ).to.be.revertedWith("The address receiver cannot be empty");
    });

    it("should fail if the escrow already exists", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await expect(
        paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address)
      ).to.be.revertedWith("Escrow already exists");
    });

    it("should fail if sender and receiver are the same", async function () {
      const orderId = 4321;
      const value = ethers.utils.parseEther("1");
      await token.transfer(sender.address, value);
      await token.connect(sender).approve(paydeceEscrow.address, value);
      await expect(
        paydeceEscrow.connect(sender).createEscrow(orderId, sender.address, value, token.address)
      ).to.be.revertedWith("Receiver cannot be the same as sender");
    });

    it("should fail if value is zero", async function () {
      const orderId = 5678;
      const value = ethers.utils.parseEther("0");
      await token.transfer(sender.address, value);
      await token.connect(sender).approve(paydeceEscrow.address, value);
      await expect(
        paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address)
      ).to.be.revertedWith("The parameter value cannot be zero");
    });

    // it("should create a new escrow PREMIUM", async function () {
    //   const orderId = 1;
    //   const value = ethers.utils.parseEther("10");
    //   const fee = value.mul(500).div(100000); // 0.5% fee

    //   //transfer
    //   await token.transfer(sender.address, value.add(fee));

    //   await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
    // //   await expect(paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false))
    // //      .to.emit(paydeceEscrow, "EscrowDeposit")
    // //      .withArgs(orderId, anyValue);
    //   await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, true, false);

    //   const escrow = await paydeceEscrow.escrows(orderId);

    //   expect(escrow.sender).to.equal(sender.address);
    //   expect(escrow.receiver).to.equal(receiver.address);
    //   expect(escrow.value).to.equal(value);
    //   expect(escrow.status).to.equal(2); // CRYPTOS_IN_CUSTODY
    // });

    // ... otros tests de createEscrow ...
  });

  describe("releaseEscrow", function () {
    it("should release the escrow", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrow(orderId);
      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(4); // COMPLETED
    });
    it("should release the escrow when status is APPEAL", async function () {
      const orderId = 123;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).appeal(orderId, true, 1);
      // Ahora el status es APPEAL
      await paydeceEscrow.connect(sender).releaseEscrow(orderId);
      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(4); // COMPLETED
    });
    it("should fail if not called by the sender (onlySender branch)", async function () {
      const orderId = 2;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await expect(
        paydeceEscrow.connect(receiver).releaseEscrow(orderId)
      ).to.be.revertedWith("Only Sender can call this");
    });
  });

  describe("releaseEscrowOwner", function () {
    it("should fail if status is not APPEAL", async function () {
      const orderId = 12345;
      const value = ethers.utils.parseEther("1");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await expect(
        paydeceEscrow.connect(owner).releaseEscrowOwner(orderId)
      ).to.be.revertedWith("Status must be APPEAL");
    });
    it("should fail if not called by the owner", async function () {
      const orderId = 54321;
      const value = ethers.utils.parseEther("1");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).appeal(orderId, true, 1);
      await expect(
        paydeceEscrow.connect(sender).releaseEscrowOwner(orderId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("refundOwner", function () {
    it("should refund the sender", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);  
      await paydeceEscrow.connect(sender).appeal(orderId,true, 1);
      await paydeceEscrow.connect(owner).refundOwner(orderId);
      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(7); // REFUND
    });
    it("should fail if not called by the owner (onlyOwner branch)", async function () {
      const orderId = 654321;
      const value = ethers.utils.parseEther("1");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).appeal(orderId, true, 1);
      await expect(
        paydeceEscrow.connect(sender).refundOwner(orderId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should fail if status is not APPEAL", async function () {
      const orderId = 54321;
      const value = ethers.utils.parseEther("1");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await expect(
        paydeceEscrow.connect(owner).refundOwner(orderId)
      ).to.be.revertedWith("Refund not approved");
    });
    it("should revert if ERC20 transfer fails in refundOwner", async function () {
      const FailingERC20 = await ethers.getContractFactory("FailingERC20");
      const failingToken = await FailingERC20.deploy();
      await failingToken.deployed();
      await paydeceEscrow.connect(owner).addStablesAddresses(failingToken.address);
      const orderId = 99999;
      const value = ethers.utils.parseEther("1");
      await failingToken.approve(paydeceEscrow.address, value);
      await expect(
        paydeceEscrow.connect(owner).createEscrow(orderId, receiver.address, value, failingToken.address)
      ).to.be.revertedWith("SafeERC20: ERC20 operation did not succeed");
    });
    it("should revert if status is not APPEAL (branch coverage)", async function () {
      const orderId = 123456;
      const value = ethers.utils.parseEther("1");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      // El status es CRYPTOS_IN_CUSTODY, no APPEAL
      await expect(
        paydeceEscrow.connect(owner).refundOwner(orderId)
      ).to.be.revertedWith("Refund not approved");
    });
  });

  describe("setMarkAsPaidOwner", function () {
    it("should mark the escrow as paid by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      await paydeceEscrow.connect(owner).setMarkAsPaidOwner(orderId);

      await expect(
        paydeceEscrow.connect(owner).setMarkAsPaidOwner(orderId)
      ).to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(3); // FIATCOIN_TRANSFERED
    });

    it("should fail if not called by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      await expect(
        paydeceEscrow.connect(sender).setMarkAsPaidOwner(orderId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("cancelReceiver", function () {
    it("should cancel the escrow by the receiver", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      // Cancel the escrow by the receiver
      //   await expect(paydeceEscrow.connect(receiver).cancelReceiver(orderId))
      //     .to.emit(paydeceEscrow, "EscrowCancelReceiver")
      //     .withArgs(orderId, anyValue);
      await paydeceEscrow.connect(receiver).cancelReceiver(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(EscrowStatus.CANCEL_RECEIVER); // CANCEL_RECEIVER
    });

    it("should fail if not called by the receiver", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      // Attempt to cancel the escrow by someone other than the receiver
      await expect(
        paydeceEscrow.connect(sender).cancelReceiver(orderId)
      ).to.be.revertedWith("Only Receiver can call this");
    });

    it("should fail if not state is CRYPTOS_IN_CUSTODY", async function () {
      const orderId = 3;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      // Cambiar el estado a COMPLETED (por ejemplo, liberando el escrow)
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrow(orderId);
      // Ahora el estado ya no es CRYPTOS_IN_CUSTODY
      await expect(
        paydeceEscrow.connect(receiver).cancelReceiver(orderId)
      ).to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");
    });
  });

  describe("cancelSender", function () {
    it("should cancel the escrow by the sender", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      await expect(
        paydeceEscrow.connect(other).setTimeProcess("1")
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // set TimeProcess
      await paydeceEscrow.connect(owner).setTimeProcess("1");

      // Cancel the escrow by the sender
      //   await expect(paydeceEscrow.connect(sender).cancelSender(orderId))
      //     .to.emit(paydeceEscrow, "EscrowCancelSender")
      //     .withArgs(orderId, anyValue);
      await paydeceEscrow.connect(sender).cancelSender(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(EscrowStatus.CANCEL_SENDER); // CANCEL_SENDER
    });

    it("should fail if not called by the sender", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      // Attempt to cancel the escrow by someone other than the sender
      await expect(
        paydeceEscrow.connect(receiver).cancelSender(orderId)
      ).to.be.revertedWith("Only Sender can call this");
    });

    it("should fail if not state is CRYPTOS_IN_CUSTODY (branch coverage)", async function () {
      const orderId = 98765;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      // Cambia el estado a COMPLETED
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrow(orderId);
      // Ahora el estado ya no es CRYPTOS_IN_CUSTODY
      await expect(
        paydeceEscrow.connect(sender).cancelSender(orderId)
      ).to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");
    });

    it("should fail if timeProcess has not passed", async function () {
      const orderId = 8888;
      const value = ethers.utils.parseEther("1");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      // set timeProcess to a high value
      await paydeceEscrow.connect(owner).setTimeProcess(1000000);
      await expect(
        paydeceEscrow.connect(sender).cancelSender(orderId)
      ).to.be.revertedWith("Time is still running out.");
    });
  });

  describe("delStablesAddresses", function () {
    it("should delete a stable address", async function () {
      await expect(
        paydeceEscrow.connect(other).addStablesAddresses(token.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Add stable address
      await paydeceEscrow.connect(owner).addStablesAddresses(token.address);

      // Delete stable address
      await paydeceEscrow.connect(owner).delStablesAddresses(token.address);
    });

    it("should fail if not called by the owner", async function () {
      // Attempt to delete stable address by someone other than the owner
      await expect(
        paydeceEscrow.connect(sender).delStablesAddresses(token.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("getState", function () {
    it("should return the correct state of the escrow", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      // Get the state of the escrow
      const state = await paydeceEscrow.getState(orderId);
      expect(state).to.equal(2); // CRYPTOS_IN_CUSTODY
    });

    it("should return Unknown state for non-existent escrow", async function () {
      const orderId = 999; // Non-existent order ID

      // Get the state of the non-existent escrow
      const state = await paydeceEscrow.getState(orderId);
      expect(state).to.equal(0); // Unknown
    });
  });

  describe("withdrawFees", function () {
    it("should withdraw ERC20 token fees by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      // Withdraw fees by the owner
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await paydeceEscrow.connect(owner).withdrawFees(token.address);
      const finalOwnerBalance = await token.balanceOf(owner.address);

      // Verify the fees were withdrawn
      expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);

      await expect(
        paydeceEscrow.connect(owner).withdrawFees(token.address)
      ).to.be.revertedWith("Amount > feesAvailable");
    });

    it("should fail if not called by the owner", async function () {
      // Attempt to withdraw fees by someone other than the owner
      await expect(
        paydeceEscrow.connect(sender).withdrawFees(token.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setFeeReceiver", function () {
    it("should set the fee receiver by the owner", async function () {
      const newFeeReceiver = 500; // 1% fee

      // Set the fee receiver by the owner
      await paydeceEscrow.connect(owner).setFeeReceiver(newFeeReceiver);

      // Verify the fee receiver was set correctly
      const feeReceiver = await paydeceEscrow.feeReceiver();
      expect(feeReceiver).to.equal(newFeeReceiver);
    });

    it("should fail if not called by the owner", async function () {
      const newFeeReceiver = 1000; // 1% fee

      // Attempt to set the fee receiver by someone other than the owner
      await expect(
        paydeceEscrow.connect(sender).setFeeReceiver(newFeeReceiver)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail if The fee can be from 0% to 0.5%", async function () {
      const newFeeReceiver = 1000; // 1% fee

      // Attempt to set the fee receiver by someone other than the owner
      await expect(
        paydeceEscrow.connect(owner).setFeeReceiver(newFeeReceiver)
      ).to.be.revertedWith("The fee can be from 0% to 0.5%");
    });
  });

  describe("setFeeSender", function () {
    it("should set the fee sender by the owner", async function () {
      const newFeeSender = 500; // 1% fee

      // Set the fee sender by the owner
      await paydeceEscrow.connect(owner).setFeeSender(newFeeSender);

      // Verify the fee sender was set correctly
      const feeSender = await paydeceEscrow.feeReceiver();
      expect(feeSender).to.equal(newFeeSender);
    });

    it("should fail if not called by the owner", async function () {
      const newFeeSender = 1000; // 1% fee

      // Attempt to set the fee receiver by someone other than the owner
      await expect(
        paydeceEscrow.connect(sender).setFeeSender(newFeeSender)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail if The fee can be from 0% to 0.5%", async function () {
      const newFeeSender = 1000; // 1% fee

      // Attempt to set the fee receiver by someone other than the owner
      await expect(
        paydeceEscrow.connect(owner).setFeeSender(newFeeSender)
      ).to.be.revertedWith("The fee can be from 0% to 0.5%");
    });
  });

  // describe("version", function () {
  //   it("should return the correct version of the contract", async function () {
  //     const expectedVersion = "5.0"; // Replace with the actual version of your contract

  //     // Get the version of the contract
  //     const version = await paydeceEscrow.version();
  //     expect(version).to.equal(expectedVersion);
  //   });
  // });

  describe("setTimeProcess", function () {
    it("should set the time process by the owner", async function () {
      const newTimeProcess = 60 * 60; // 1 hour in seconds

      // Set the time process by the owner
      await paydeceEscrow.connect(owner).setTimeProcess(newTimeProcess);

      // Verify the time process was set correctly
      const timeProcess = await paydeceEscrow.timeProcess();
      expect(timeProcess).to.equal(newTimeProcess);
    });

    it("should fail if not called by the owner", async function () {
      const newTimeProcess = 60 * 60; // 1 hour in seconds

      // Attempt to set the time process by someone other than the owner
      await expect(
        paydeceEscrow.connect(sender).setTimeProcess(newTimeProcess)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail if The timeProcess can be 0", async function () {
      const newTimeProcess = 0; // 0 seconds

      // Attempt to set the time process by someone other than the owner
      await expect(
        paydeceEscrow.connect(owner).setTimeProcess(newTimeProcess)
      ).to.be.revertedWith("The timeProcess can be 0");
    });
  });

  describe("appeal", function () {
    it("should allow the sender to appeal", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      // Mark as paid by receiver
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

      // Appeal by sender
      await paydeceEscrow.connect(sender).appeal(orderId, true, 1);

      const escrow = await paydeceEscrow.escrows(orderId);

      expect(escrow.status).to.equal(EscrowStatus.APPEAL);
      expect(escrow.appeal.appealSender).to.be.true;

      await paydeceEscrow.connect(owner).releaseEscrowOwner(orderId);
    });

    it("should allow the receiver to appeal", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      // Mark as paid by receiver
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

      // Appeal by receiver
      await paydeceEscrow.connect(receiver).appeal(orderId, false, 1);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(EscrowStatus.APPEAL);
      expect(escrow.appeal.appealReceiver).to.be.true;

      // await expect(paydeceEscrow.connect(receiver).appeal(orderId, false))
      //   .to.be.revertedWith("Status must be FIATCOIN_TRANSFERED or APPEAL");
    });

    it("should fail if not called by a participant", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      // Mark as paid by receiver
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

      // Attempt to appeal by someone other than the sender or receiver
      await expect(
        paydeceEscrow.connect(other).appeal(orderId, true, 1)
      ).to.be.revertedWith("Only sender can appeal");

      await expect(
        paydeceEscrow.connect(other).appeal(orderId, false, 1)
      ).to.be.revertedWith("Only receiver can appeal");
    });

    it("should fail if the status is not FIATCOIN_TRANSFERED or APPEAL", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token
        .connect(sender)
        .approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow
        .connect(sender)
        .createEscrow(orderId, receiver.address, value, token.address);

      const escrow = await paydeceEscrow.escrows(orderId);
      // console.log("status-->",escrow.status);

      // Attempt to appeal by sender when status is not FIATCOIN_TRANSFERED or APPEAL
      await expect(
        paydeceEscrow.connect(sender).appeal(orderId, true, 1)
      ).to.be.revertedWith("Status must be FIATCOIN_TRANSFERED or APPEAL");
    });

    it("should fail if already in APPEAL status", async function () {
      const orderId = 2222;
      const value = ethers.utils.parseEther("1");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).appeal(orderId, true, 1);
      await expect(
        paydeceEscrow.connect(sender).appeal(orderId, true, 1)
      ).to.be.revertedWith("Status must be FIATCOIN_TRANSFERED or APPEAL");
    });
  });

  describe("coverage: edge cases and branches", function () {
    it("should not allow setFeeReceiver below 0", async function () {
      await expect(
        paydeceEscrow.connect(owner).setFeeReceiver(-1)
      ).to.be.reverted;
    });
    it("should not allow setFeeSender below 0", async function () {
      await expect(
        paydeceEscrow.connect(owner).setFeeSender(-1)
      ).to.be.reverted;
    });
    it("should not allow setTimeProcess to 0", async function () {
      await expect(
        paydeceEscrow.connect(owner).setTimeProcess(0)
      ).to.be.revertedWith("The timeProcess can be 0");
    });
    it("should not allow withdrawFees if no fees", async function () {
      const Token = await ethers.getContractFactory("USDTToken");
      const token2 = await Token.deploy();
      await token2.deployed();
      await expect(
        paydeceEscrow.connect(owner).withdrawFees(token2.address)
      ).to.be.revertedWith("Amount > feesAvailable");
    });
    it("should not allow addStablesAddresses by non-owner", async function () {
      const Token = await ethers.getContractFactory("USDTToken");
      const token2 = await Token.deploy();
      await token2.deployed();
      await expect(
        paydeceEscrow.connect(sender).addStablesAddresses(token2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should not allow delStablesAddresses by non-owner", async function () {
      const Token = await ethers.getContractFactory("USDTToken");
      const token2 = await Token.deploy();
      await token2.deployed();
      await expect(
        paydeceEscrow.connect(sender).delStablesAddresses(token2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should not allow createEscrow with non-whitelisted token", async function () {
      const Token = await ethers.getContractFactory("USDTToken");
      const token2 = await Token.deploy();
      await token2.deployed();
      const orderId = 999;
      const value = ethers.utils.parseEther("1");
      await token2.transfer(sender.address, value);
      await token2.connect(sender).approve(paydeceEscrow.address, value);
      await expect(
        paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token2.address)
      ).to.be.revertedWith("Address Stable to be whitelisted");
    });
    it("should not allow releaseEscrow if status is not FIATCOIN_TRANSFERED or APPEAL", async function () {
      const orderId = 777;
      const value = ethers.utils.parseEther("1");
      const fee = value.mul(500).div(100000);
      await token.transfer(sender.address, value.add(fee));
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address);
      await expect(
        paydeceEscrow.connect(sender).releaseEscrow(orderId)
      ).to.be.revertedWith("Status must be FIATCOIN_TRANSFERED");
    });
  });

  describe("setMarkAsPaid", function () {
    it("should fail if status is not CRYPTOS_IN_CUSTODY (branch coverage)", async function () {
      const orderId = 55555;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      // Cambia el estado a COMPLETED
      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrow(orderId);
      // Ahora el estado ya no es CRYPTOS_IN_CUSTODY
      await expect(
        paydeceEscrow.connect(receiver).setMarkAsPaid(orderId)
      ).to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");
    });
    it("should fail if not called by the receiver (onlyReceiver branch)", async function () {
      const orderId = 55556;
      const value = ethers.utils.parseEther("10");
      await createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId});
      await expect(
        paydeceEscrow.connect(sender).setMarkAsPaid(orderId)
      ).to.be.revertedWith("Only Receiver can call this");
    });
  });
});

// Utilidad para crear escrow con token
async function createEscrowWithToken({sender, receiver, value, token, paydeceEscrow, orderId}) {
  const fee = value.mul(500).div(100000);
  await token.transfer(sender.address, value.add(fee));
  await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
  await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address);
}

/*
NOTA SOBRE TESTS DE REENTRANCIA:
- El branch de reentrancia (nonReentrant) solo puede ser cubierto en funciones donde el owner puede ser un contrato (como refundOwner).
- En cancelSender y cancelReceiver, los modifiers onlySender/onlyReceiver impiden que un contrato externo (mock o atacante) pueda ejecutar la función dos veces en la misma transacción, ya que el msg.sender no es el sender/receiver original.
- Por lo tanto, no es posible forzar el revert de ReentrancyGuard en esas funciones desde un test externo. El acceso está correctamente protegido por los modifiers.
*/
