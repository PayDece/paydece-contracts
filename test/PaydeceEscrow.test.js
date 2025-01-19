const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaydeceEscrow", function () {
  let PaydeceEscrow, paydeceEscrow, owner, sender, receiver, other,Receiver;
  let token;

  const EscrowStatus = {
    UNKNOWN: 0,
    ACTIVE: 1,
    CRYPTOS_IN_CUSTODY: 2,
    FIATCOIN_TRANSFERED: 3,
    COMPLETED: 4,
    UNKNOWN_5: 5,
    UNKNOWN_6: 6,
    REFUND: 7,
    UNKNOWN_8: 8,
    CANCEL_SENDER: 9,
    CANCEL_RECEIVER: 10
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
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
    //   await expect(paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false))
    //      .to.emit(paydeceEscrow, "EscrowDeposit")
    //      .withArgs(orderId, anyValue);
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      const escrow = await paydeceEscrow.escrows(orderId);
      
      expect(escrow.sender).to.equal(sender.address);
      expect(escrow.receiver).to.equal(receiver.address);
      expect(escrow.value).to.equal(value);
      expect(escrow.status).to.equal(2); // CRYPTOS_IN_CUSTODY
    });

    it("should create a new escrow PREMIUM", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
    //   await expect(paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false))
    //      .to.emit(paydeceEscrow, "EscrowDeposit")
    //      .withArgs(orderId, anyValue);
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, true, false);

      const escrow = await paydeceEscrow.escrows(orderId);
      
      expect(escrow.sender).to.equal(sender.address);
      expect(escrow.receiver).to.equal(receiver.address);
      expect(escrow.value).to.equal(value);
      expect(escrow.status).to.equal(2); // CRYPTOS_IN_CUSTODY
    });

    it("should fail if the escrow already exists", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));

      await expect(paydeceEscrow.connect(sender).createEscrow(orderId, ethers.constants.AddressZero, value, token.address, false, false))
        .to.be.revertedWith("The address receiver cannot be empty");

        await expect(paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, other.address, false, false))
        .to.be.revertedWith("Address Stable to be whitelisted");

        await expect(paydeceEscrow.connect(sender).createEscrow(orderId, sender.address, value, token.address, false, false))
        .to.be.revertedWith("Receiver cannot be the same as sender");

        await expect(paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, 0, token.address, false, false))
        .to.be.revertedWith("The parameter value cannot be zero");

      //Create escrow  
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      await expect(paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false))
        .to.be.revertedWith("Escrow already exists");

        
    });
  });

  describe("createEscrowNativeCoin", function () {
    it("should create a new escrow with native coin", async function () {
      const orderId = 2;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

    //   await expect(paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) }))
    //     .to.emit(paydeceEscrow, "EscrowDeposit")
    //     .withArgs(orderId, anyValue);
    await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.sender).to.equal(sender.address);
      expect(escrow.receiver).to.equal(receiver.address);
      expect(escrow.value).to.equal(value);
      expect(escrow.status).to.equal(2); // CRYPTOS_IN_CUSTODY
    });

    it("should create a new escrow with native coin PREMIUM", async function () {
      const orderId = 2;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

    //   await expect(paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) }))
    //     .to.emit(paydeceEscrow, "EscrowDeposit")
    //     .withArgs(orderId, anyValue);
    await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, true, false, { value: value});

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.sender).to.equal(sender.address);
      expect(escrow.receiver).to.equal(receiver.address);
      expect(escrow.value).to.equal(value);
      expect(escrow.status).to.equal(2); // CRYPTOS_IN_CUSTODY
    });

    it("should fail if the escrow already exists", async function () {
      const orderId = 2;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee      

      await expect(paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value }))
      .to.be.revertedWith("Incorrect amount");

      await expect(paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, ethers.constants.AddressZero, value, false, false, { value: value.add(fee) }))
      .to.be.revertedWith("The address receiver cannot be empty");

      await expect(paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, sender.address, value, false, false, { value: value.add(fee) }))
      .to.be.revertedWith("Receiver cannot be the same as sender");

      await expect(paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, 0, false, false, { value: value.add(fee) }))
      .to.be.revertedWith("The parameter value cannot be zero");

      //CreateEscrow
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      await expect(paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) }))
        .to.be.revertedWith("Escrow already exists");

        

    });
  });

  describe("releaseEscrow", function () {
    it("should release the escrow", async function () {
        const orderId = 1;
        const value = ethers.utils.parseEther("10");
        const fee = value.mul(500).div(100000); // 0.5% fee

        //transfer
        await token.transfer(sender.address, value.add(fee));

        await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
        await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

        await expect(paydeceEscrow.connect(sender).setMarkAsPaid(orderId))
            .to.be.revertedWith("Only Receiver can call this");

        await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

        //   await expect(paydeceEscrow.connect(sender).releaseEscrow(orderId))
        //     .to.emit(paydeceEscrow, "EscrowComplete")
        //     .withArgs(orderId, anyValue);
        await paydeceEscrow.connect(sender).releaseEscrow(orderId);

        const escrow = await paydeceEscrow.escrows(orderId);
        
        expect(escrow.status).to.equal(4); // COMPLETED
    });

    it("should release the escrow PREMIUM", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, true, true);

      await expect(paydeceEscrow.connect(sender).setMarkAsPaid(orderId))
          .to.be.revertedWith("Only Receiver can call this");

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

      //   await expect(paydeceEscrow.connect(sender).releaseEscrow(orderId))
      //     .to.emit(paydeceEscrow, "EscrowComplete")
      //     .withArgs(orderId, anyValue);
      await paydeceEscrow.connect(sender).releaseEscrow(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      
      expect(escrow.status).to.equal(4); // COMPLETED
  });

    it("should fail if not called by the sender", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

    //   await expect(paydeceEscrow.connect(receiver).releaseEscrow(orderId))
    //     .to.be.revertedWith("Only Sender can call this");
    await expect(paydeceEscrow.connect(receiver).releaseEscrow(orderId))
        .to.be.revertedWith("Only Sender can call this");
    });    
  });

  describe("refundSender", function () {
    it("should refund the sender", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

    //   await expect(paydeceEscrow.connect(owner).refundSender(orderId))
    //     .to.emit(paydeceEscrow, "EscrowRefundSender")
    //     .withArgs(orderId, anyValue);
    await paydeceEscrow.connect(owner).refundSender(orderId);
      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(EscrowStatus.REFUND); // REFUND
    });

    it("should refund the sender PREMIUM", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, true, true);

    //   await expect(paydeceEscrow.connect(owner).refundSender(orderId))
    //     .to.emit(paydeceEscrow, "EscrowRefundSender")
    //     .withArgs(orderId, anyValue);
    await paydeceEscrow.connect(owner).refundSender(orderId);
      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(EscrowStatus.REFUND); // REFUND
    });

    it("should fail if not called by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      await expect(paydeceEscrow.connect(sender).refundSender(orderId))
        .to.be.revertedWith("Ownable: caller is not the owner");

        await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

        await paydeceEscrow.connect(sender).releaseEscrow(orderId);

        // const state = await paydeceEscrow.getState(orderId);
        // console.log("state", state);

        await expect(paydeceEscrow.connect(owner).refundSender(orderId))
        .to.be.revertedWith("Refund not approved");  
    });
    
  });

  describe("releaseEscrowNativeCoin", function () {
    it("should release the escrow with native coin", async function () {
      const orderId = 2;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

      await paydeceEscrow.connect(sender).releaseEscrowNativeCoin(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(4); // COMPLETED
    });

    it("should release the escrow with native coin PREMIUM", async function () {
      const orderId = 2;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, true, { value: value.add(fee) });

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

      await paydeceEscrow.connect(sender).releaseEscrowNativeCoin(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(4); // COMPLETED
    });

    it("should fail if not called by the sender", async function () {
      const orderId = 2;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

      await expect(paydeceEscrow.connect(receiver).releaseEscrowNativeCoin(orderId))
        .to.be.revertedWith("Only Sender can call this");
    });

    it("should fail if Refund not approved", async function () {
      const orderId = 3;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrowNativeCoin(orderId);

      await expect(paydeceEscrow.connect(owner).refundSenderNativeCoin(orderId))
        .to.be.revertedWith("Refund not approved");
    });
  });

  describe("setMarkAsPaidOwner", function () {
    it("should mark the escrow as paid by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      await paydeceEscrow.connect(owner).setMarkAsPaidOwner(orderId);

      await expect(paydeceEscrow.connect(owner).setMarkAsPaidOwner(orderId))
        .to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(3); // FIATCOIN_TRANSFERED
    });

    it("should fail if not called by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      //transfer
      await token.transfer(sender.address, value.add(fee));

      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      await expect(paydeceEscrow.connect(sender).setMarkAsPaidOwner(orderId))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("cancelReceiverNative", function () {
    it("should cancel the escrow by the receiver with native coin", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      // Cancel the escrow by the receiver
    //   await expect(paydeceEscrow.connect(receiver).cancelReceiverNative(orderId))
    //     .to.emit(paydeceEscrow, "EscrowCancelReceiver")
    //     .withArgs(orderId, anyValue);
    await paydeceEscrow.connect(receiver).cancelReceiverNative(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(EscrowStatus.CANCEL_RECEIVER); // CANCEL_RECEIVER
    });

    it("should fail if not called by the receiver", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      // Attempt to cancel the escrow by someone other than the receiver
      await expect(paydeceEscrow.connect(sender).cancelReceiverNative(orderId))
        .to.be.revertedWith("Only Receiver can call this");
    });

    it("should fail if not state is CRYPTOS_IN_CUSTODY", async function () {
      const orderId = 3;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

     

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrowNativeCoin(orderId);

      await expect(paydeceEscrow.connect(receiver).setMarkAsPaid(orderId))
      .to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");
      
      // Attempt to cancel the escrow by someone other than the sender
      await expect(paydeceEscrow.connect(receiver).cancelReceiverNative(orderId))
        .to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");
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
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

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
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      // Attempt to cancel the escrow by someone other than the receiver
      await expect(paydeceEscrow.connect(sender).cancelReceiver(orderId))
        .to.be.revertedWith("Only Receiver can call this");
    });

    it("should fail if not state is CRYPTOS_IN_CUSTODY", async function () {
      const orderId = 3;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

     

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrow(orderId);

      await expect(paydeceEscrow.connect(sender).releaseEscrow(orderId))
      .to.be.revertedWith("Status must be FIATCOIN_TRANSFERED");
      
      // Attempt to cancel the escrow by someone other than the sender
      await expect(paydeceEscrow.connect(receiver).cancelReceiver(orderId))
        .to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");
    });
  });

  describe("cancelSenderNative", function () {
    it("should cancel the escrow by the sender with native coin", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      await expect(
              paydeceEscrow.connect(other).setTimeProcess("1")
            ).to.be.revertedWith("Ownable: caller is not the owner");
        
        // set TimeProcess
        await paydeceEscrow.connect(owner).setTimeProcess("1");

      // Cancel the escrow by the sender
    //   await expect(paydeceEscrow.connect(sender).cancelSenderNative(orderId))
    //     .to.emit(paydeceEscrow, "EscrowCancelSender")
    //     .withArgs(orderId, anyValue);
    await paydeceEscrow.connect(sender).cancelSenderNative(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(EscrowStatus.CANCEL_SENDER); // CANCEL_SENDER
    });

    it("should fail if not called by the sender", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      // Attempt to cancel the escrow by someone other than the sender
      await expect(paydeceEscrow.connect(receiver).cancelSenderNative(orderId))
        .to.be.revertedWith("Only Sender can call this");
    });

    it("should fail if not state is CRYPTOS_IN_CUSTODY", async function () {
      const orderId = 3;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      await paydeceEscrow.connect(owner).setTimeProcess(100000);
      await expect(paydeceEscrow.connect(sender).cancelSenderNative(orderId))
      .to.be.revertedWith("Time is still running out.");

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrowNativeCoin(orderId);

      await expect(paydeceEscrow.connect(sender).releaseEscrowNativeCoin(orderId))
      .to.be.revertedWith("Native Coin has not been deposited");
      
      // Attempt to cancel the escrow by someone other than the sender
      await expect(paydeceEscrow.connect(sender).cancelSenderNative(orderId))
        .to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");
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
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

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
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      // Attempt to cancel the escrow by someone other than the sender
      await expect(paydeceEscrow.connect(receiver).cancelSender(orderId))
        .to.be.revertedWith("Only Sender can call this");
    });

    it("should fail if not state is CRYPTOS_IN_CUSTODY", async function () {
      const orderId = 3;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      await paydeceEscrow.connect(owner).setTimeProcess(100000);
      await expect(paydeceEscrow.connect(sender).cancelSender(orderId))
      .to.be.revertedWith("Time is still running out.");

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
      await paydeceEscrow.connect(sender).releaseEscrow(orderId);
      
      // Attempt to cancel the escrow by someone other than the sender
      await expect(paydeceEscrow.connect(sender).cancelSender(orderId))
        .to.be.revertedWith("Status must be CRYPTOS_IN_CUSTODY");
    });
  });

  describe("delStablesAddresses", function () {
    it("should delete a stable address", async function () {
      await expect(paydeceEscrow.connect(other).addStablesAddresses(token.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
      
      // Add stable address
      await paydeceEscrow.connect(owner).addStablesAddresses(token.address);

      // Delete stable address
      await paydeceEscrow.connect(owner).delStablesAddresses(token.address);

    });

    it("should fail if not called by the owner", async function () {
      // Attempt to delete stable address by someone other than the owner
      await expect(paydeceEscrow.connect(sender).delStablesAddresses(token.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
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
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

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

  describe("withdrawFeesNativeCoin", function () {
    it("should withdraw native coin fees by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      // Withdraw fees by the owner
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      await paydeceEscrow.connect(owner).withdrawFeesNativeCoin();
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

      // Verify the fees were withdrawn
      expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);

      await expect(paydeceEscrow.connect(owner).withdrawFeesNativeCoin())
      .to.be.revertedWith("Amount > feesAvailable");
    });

    it("should fail if not called by the owner", async function () {
      // Attempt to withdraw fees by someone other than the owner
      await expect(paydeceEscrow.connect(sender).withdrawFeesNativeCoin())
        .to.be.revertedWith("Ownable: caller is not the owner");
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
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      // Withdraw fees by the owner
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await paydeceEscrow.connect(owner).withdrawFees(token.address);
      const finalOwnerBalance = await token.balanceOf(owner.address);

      // Verify the fees were withdrawn
      expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);

      await expect(paydeceEscrow.connect(owner).withdrawFees(token.address))
      .to.be.revertedWith("Amount > feesAvailable");
    });

    it("should fail if not called by the owner", async function () {
      // Attempt to withdraw fees by someone other than the owner
      await expect(paydeceEscrow.connect(sender).withdrawFees(token.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("refundSenderNativeCoin", function () {
    it("should refund the sender with native coin by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      // Refund the sender by the owner
      const initialSenderBalance = await ethers.provider.getBalance(sender.address);
      await paydeceEscrow.connect(owner).refundSenderNativeCoin(orderId);
      const finalSenderBalance = await ethers.provider.getBalance(sender.address);

      // Verify the refund was successful
      expect(finalSenderBalance).to.be.gt(initialSenderBalance);
    });

    it("should fail if not called by the owner", async function () {
      const orderId = 2;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      // Attempt to refund the sender by someone other than the owner
      await expect(paydeceEscrow.connect(sender).refundSenderNativeCoin(orderId))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });    
  });

  describe("releaseEscrowOwner", function () {
    it("should release the escrow by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);

      // Release the escrow by the owner
    //   await expect(paydeceEscrow.connect(owner).releaseEscrowOwner(orderId))
    //     .to.emit(paydeceEscrow, "EscrowComplete")
    //     .withArgs(orderId, anyValue);
    await paydeceEscrow.connect(owner).releaseEscrowOwner(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(4); // COMPLETED
    });

    it("should fail if not called by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("10");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Transfer tokens to sender
      await token.transfer(sender.address, value.add(fee));

      // Approve and create escrow
      await token.connect(sender).approve(paydeceEscrow.address, value.add(fee));
      await paydeceEscrow.connect(sender).createEscrow(orderId, receiver.address, value, token.address, false, false);

      // Attempt to release the escrow by someone other than the owner
      await expect(paydeceEscrow.connect(sender).releaseEscrowOwner(orderId))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });    

  describe("releaseEscrowOwnerNativeCoin", function () {
    it("should release the escrow with native coin by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);  

      // Release the escrow by the owner
    //   await expect(paydeceEscrow.connect(owner).releaseEscrowOwnerNativeCoin(orderId))
    //     .to.emit(paydeceEscrow, "EscrowComplete")
    //     .withArgs(orderId, anyValue);
    await paydeceEscrow.connect(owner).releaseEscrowOwnerNativeCoin(orderId);

      const escrow = await paydeceEscrow.escrows(orderId);
      expect(escrow.status).to.equal(4); // COMPLETED
    });

    it("should fail if not called by the owner", async function () {
      const orderId = 1;
      const value = ethers.utils.parseEther("5");
      const fee = value.mul(500).div(100000); // 0.5% fee

      // Create escrow with native coin
      await paydeceEscrow.connect(sender).createEscrowNativeCoin(orderId, receiver.address, value, false, false, { value: value.add(fee) });

      // Attempt to release the escrow by someone other than the owner
      await expect(paydeceEscrow.connect(sender).releaseEscrowOwnerNativeCoin(orderId))
        .to.be.revertedWith("Ownable: caller is not the owner");
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
      await expect(paydeceEscrow.connect(sender).setFeeReceiver(newFeeReceiver))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail if The fee can be from 0% to 0.5%", async function () {
      const newFeeReceiver = 1000; // 1% fee

      // Attempt to set the fee receiver by someone other than the owner
      await expect(paydeceEscrow.connect(owner).setFeeReceiver(newFeeReceiver))
        .to.be.revertedWith("The fee can be from 0% to 0.5%");
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
      await expect(paydeceEscrow.connect(sender).setFeeSender(newFeeSender))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail if The fee can be from 0% to 0.5%", async function () {
      const newFeeSender = 1000; // 1% fee

      // Attempt to set the fee receiver by someone other than the owner
      await expect(paydeceEscrow.connect(owner).setFeeSender(newFeeSender))
        .to.be.revertedWith("The fee can be from 0% to 0.5%");
    });
  });

  describe("version", function () {
    it("should return the correct version of the contract", async function () {
      const expectedVersion = "5.0"; // Replace with the actual version of your contract

      // Get the version of the contract
      const version = await paydeceEscrow.version();
      expect(version).to.equal(expectedVersion);
    });
  });

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
      await expect(paydeceEscrow.connect(sender).setTimeProcess(newTimeProcess))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail if The timeProcess can be 0", async function () {
        const newTimeProcess = 0; // 0 seconds
  
        // Attempt to set the time process by someone other than the owner
        await expect(paydeceEscrow.connect(owner).setTimeProcess(newTimeProcess))
          .to.be.revertedWith("The timeProcess can be 0");
      });
  });

  // Add more tests for other functions like setTimeProcess, addStablesAddresses, delStablesAddresses, etc.
});
