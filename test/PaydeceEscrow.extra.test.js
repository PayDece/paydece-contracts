const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaydeceEscrow Extra Flow", function () {
  let paydeceEscrow, usdt, owner, sender, receiver;

  beforeEach(async function () {
    [owner, sender, receiver] = await ethers.getSigners();
    // Deploy USDTToken
    const USDTToken = await ethers.getContractFactory("USDTToken");
    usdt = await USDTToken.deploy();
    await usdt.deployed();
    // Transfer tokens del owner al sender
    await usdt.connect(owner).transfer(sender.address, ethers.utils.parseUnits("1000", 18));
    // Deploy PaydeceEscrow
    const PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
    paydeceEscrow = await PaydeceEscrow.deploy(owner.address);
    await paydeceEscrow.deployed();
    // Whitelist USDT
    await paydeceEscrow.connect(owner).addStableAddress(usdt.address);
  });

  it("should create escrow, mark as paid, and release escrow", async function () {
    const orderId = 1;
    const value = ethers.utils.parseUnits("100", 18);
    // Calcular el fee real según la lógica del contrato
    const fee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
    // El fee esperado es scale3Percent para 100 USDT
    const scale3Percent = await paydeceEscrow.scale3Percent();
    const expectedFee = value.mul(scale3Percent).div(10000);
    expect(fee).to.equal(expectedFee);
    // Sender aprueba escrow contract por value + fee
    await usdt.connect(sender).approve(paydeceEscrow.address, value.add(fee));
    // Create escrow
    await paydeceEscrow.connect(sender).createEscrow(
      orderId,
      receiver.address,
      value,
      usdt.address
    );
    // Receiver marks as paid
    await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
    // Sender releases escrow
    await paydeceEscrow.connect(sender).releaseEscrow(orderId);
    // Assert escrow is completed
    const escrow = await paydeceEscrow.escrows(orderId);
    expect(escrow.status).to.equal(4); // COMPLETED
    // Assert receiver received funds minus fee
    const receiverBalance = await usdt.balanceOf(receiver.address);
    expect(receiverBalance).to.be.above(0);
  });

  it("should allow sender to create and immediately release escrow, and check balances and fees", async function () {
    const orderId = 2;
    const value = ethers.utils.parseUnits("50", 18);
    // Calcular ambos fees
    const senderfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
    const receiverfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
    // Balances iniciales
    const senderInitial = await usdt.balanceOf(sender.address);
    const receiverInitial = await usdt.balanceOf(receiver.address);
    const contractInitial = await usdt.balanceOf(paydeceEscrow.address);
    // Approve
    await usdt.connect(sender).approve(paydeceEscrow.address, value.add(senderfee));
    // Create escrow
    await paydeceEscrow.connect(sender).createEscrow(
      orderId,
      receiver.address,
      value,
      usdt.address
    );
    // Release directamente (sin setMarkAsPaid)
    await paydeceEscrow.connect(sender).releaseEscrow(orderId);
    // Balances finales
    const senderFinal = await usdt.balanceOf(sender.address);
    const receiverFinal = await usdt.balanceOf(receiver.address);
    const contractFinal = await usdt.balanceOf(paydeceEscrow.address);
    // Fee registrado en el contrato
    const feesAvailable = await paydeceEscrow.feesAvailable(usdt.address);
    // Chequeos
    expect(senderFinal).to.equal(senderInitial.sub(value).sub(senderfee));
    expect(receiverFinal).to.equal(receiverInitial.add(value.sub(receiverfee)));
    expect(contractFinal).to.equal(senderfee.add(receiverfee)); // El contrato retiene los fees
    expect(feesAvailable).to.equal(senderfee.add(receiverfee)); // Fee sender + fee receiver
  });

  it("should create escrow, mark as paid, and release escrow with both sender and receiver as merchants", async function () {
    const orderId = 10;
    const value = ethers.utils.parseUnits("100", 18);

    // Set merchant status for both parties
    await paydeceEscrow.setMerchantStatus(sender.address, true);
    await paydeceEscrow.setMerchantStatus(receiver.address, true);

    // Calcular ambos fees
    const senderfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, true);
    const receiverfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, true);
    // Transferir tokens si hace falta
    // Approve
    await usdt.connect(sender).approve(paydeceEscrow.address, value.add(senderfee));
    // Balances iniciales
    const senderInitial = await usdt.balanceOf(sender.address);
    const receiverInitial = await usdt.balanceOf(receiver.address);
    // Create escrow
    await paydeceEscrow.connect(sender).createEscrow(
      orderId,
      receiver.address,
      value,
      usdt.address
    );
    // Receiver marks as paid
    await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
    // Sender releases escrow
    await paydeceEscrow.connect(sender).releaseEscrow(orderId);
    // Balances finales
    const senderFinal = await usdt.balanceOf(sender.address);
    const receiverFinal = await usdt.balanceOf(receiver.address);
    const contractFinal = await usdt.balanceOf(paydeceEscrow.address);
    const feesAvailable = await paydeceEscrow.feesAvailable(usdt.address);
    // Chequeos
    expect(senderFinal).to.equal(senderInitial.sub(value).sub(senderfee));
    expect(receiverFinal).to.equal(receiverInitial.add(value.sub(receiverfee)));
    expect(contractFinal).to.equal(senderfee.add(receiverfee));
    expect(feesAvailable).to.equal(senderfee.add(receiverfee));
  });

  it("should allow sender to create and immediately release escrow with both as merchants, and check balances and fees", async function () {
    const orderId = 11;
    const value = ethers.utils.parseUnits("50", 18);
    
    // Set merchant status for both parties
    await paydeceEscrow.setMerchantStatus(sender.address, true);
    await paydeceEscrow.setMerchantStatus(receiver.address, true);

    // Calcular ambos fees
    const senderfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, true);
    const receiverfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, true);
    // Approve
    await usdt.connect(sender).approve(paydeceEscrow.address, value.add(senderfee));
    // Balances iniciales
    const senderInitial = await usdt.balanceOf(sender.address);
    const receiverInitial = await usdt.balanceOf(receiver.address);
    // Create escrow
    await paydeceEscrow.connect(sender).createEscrow(
      orderId,
      receiver.address,
      value,
      usdt.address
    );
    // Release directamente
    await paydeceEscrow.connect(sender).releaseEscrow(orderId);
    // Balances finales
    const senderFinal = await usdt.balanceOf(sender.address);
    const receiverFinal = await usdt.balanceOf(receiver.address);
    const contractFinal = await usdt.balanceOf(paydeceEscrow.address);
    const feesAvailable = await paydeceEscrow.feesAvailable(usdt.address);
    // Chequeos
    expect(senderFinal).to.equal(senderInitial.sub(value).sub(senderfee));
    expect(receiverFinal).to.equal(receiverInitial.add(value.sub(receiverfee)));
    expect(contractFinal).to.equal(senderfee.add(receiverfee));
    expect(feesAvailable).to.equal(senderfee.add(receiverfee));
  });

  it("should allow sender to cancel escrow after timeProcess and receive value + senderfee", async function () {
    const orderId = 20;
    const value = ethers.utils.parseUnits("100", 18);
    // Calcular ambos fees
    const senderfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
    // Approve
    await usdt.connect(sender).approve(paydeceEscrow.address, value.add(senderfee));
    // Balances iniciales
    const senderInitial = await usdt.balanceOf(sender.address);
    // Create escrow
    await paydeceEscrow.connect(sender).createEscrow(
      orderId,
      receiver.address,
      value,
      usdt.address
    );

    // Intentar cancelar antes de que pase el tiempo
    await expect(
        paydeceEscrow.connect(sender).cancelSender(orderId)
      ).to.be.revertedWith("Time is still running out.");

    // Simular paso del tiempo
    await ethers.provider.send("evm_increaseTime", [Number(await paydeceEscrow.timeProcess()) + 1]);
    await ethers.provider.send("evm_mine");
    // Cancelar por sender
    await paydeceEscrow.connect(sender).cancelSender(orderId);
    // Balances finales
    const senderFinal = await usdt.balanceOf(sender.address);
    const contractFinal = await usdt.balanceOf(paydeceEscrow.address);
    // Chequeos
    expect(senderFinal).to.equal(senderInitial); // Recupera value + senderfee
    expect(contractFinal).to.equal(0); // El contrato no retiene fondos
  });

  it("should allow owner to withdraw fees after escrow is released", async function () {
    const orderId = 30;
    const value = ethers.utils.parseUnits("100", 18);
    // Calcular ambos fees
    const senderfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
    const receiverfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
    await usdt.connect(sender).approve(paydeceEscrow.address, value.add(senderfee));
    // Create and release escrow
    await paydeceEscrow.connect(sender).createEscrow(
      orderId,
      receiver.address,
      value,
      usdt.address
    );
    await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
    await paydeceEscrow.connect(sender).releaseEscrow(orderId);
    // Fees disponibles
    const feesAvailableBefore = await paydeceEscrow.feesAvailable(usdt.address);
    expect(feesAvailableBefore).to.equal(senderfee.add(receiverfee));
    const ownerBalanceBefore = await usdt.balanceOf(owner.address);
    // Owner retira fees
    await paydeceEscrow.connect(owner).withdrawFees(usdt.address);
    // Fees después
    const feesAvailableAfter = await paydeceEscrow.feesAvailable(usdt.address);
    expect(feesAvailableAfter).to.equal(0);
    const ownerBalanceAfter = await usdt.balanceOf(owner.address);
    expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(senderfee.add(receiverfee));
  });

  it("should fail to withdraw fees if there are no fees available", async function () {
    await expect(
      paydeceEscrow.connect(owner).withdrawFees(usdt.address)
    ).to.be.revertedWith("No fees available for withdrawal");
  });

  it("should handle sender as merchant and receiver as non-merchant, and check balances and fees", async function () {
    const orderId = 100;
    const value = ethers.utils.parseUnits("200", 18);
    
    // Set merchant status for sender only
    await paydeceEscrow.setMerchantStatus(sender.address, true);

    // Calcular ambos fees
    const senderfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, true);
    const receiverfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
    // Balances iniciales
    const senderInitial = await usdt.balanceOf(sender.address);
    const receiverInitial = await usdt.balanceOf(receiver.address);
    // Approve
    await usdt.connect(sender).approve(paydeceEscrow.address, value.add(senderfee));
    // Create escrow
    await paydeceEscrow.connect(sender).createEscrow(
      orderId,
      receiver.address,
      value,
      usdt.address
    );
    // Receiver marks as paid
    await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
    // Sender releases escrow
    await paydeceEscrow.connect(sender).releaseEscrow(orderId);
    // Balances finales
    const senderFinal = await usdt.balanceOf(sender.address);
    const receiverFinal = await usdt.balanceOf(receiver.address);
    const contractFinal = await usdt.balanceOf(paydeceEscrow.address);
    const feesAvailable = await paydeceEscrow.feesAvailable(usdt.address);
    // Chequeos
    expect(senderFinal).to.equal(senderInitial.sub(value).sub(senderfee));
    expect(receiverFinal).to.equal(receiverInitial.add(value.sub(receiverfee)));
    expect(contractFinal).to.equal(senderfee.add(receiverfee));
    expect(feesAvailable).to.equal(senderfee.add(receiverfee));
  });

  it("should handle receiver as merchant and sender as non-merchant, and check balances and fees", async function () {
    const orderId = 101;
    const value = ethers.utils.parseUnits("300", 18);
    
    // Set merchant status for receiver only
    await paydeceEscrow.setMerchantStatus(receiver.address, true);

    // Calcular ambos fees
    const senderfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, false);
    const receiverfee = await paydeceEscrow.publicCalculateFee(value, usdt.address, true);
    // Balances iniciales
    const senderInitial = await usdt.balanceOf(sender.address);
    const receiverInitial = await usdt.balanceOf(receiver.address);
    // Approve
    await usdt.connect(sender).approve(paydeceEscrow.address, value.add(senderfee));
    // Create escrow
    await paydeceEscrow.connect(sender).createEscrow(
      orderId,
      receiver.address,
      value,
      usdt.address
    );
    // Receiver marks as paid
    await paydeceEscrow.connect(receiver).setMarkAsPaid(orderId);
    // Sender releases escrow
    await paydeceEscrow.connect(sender).releaseEscrow(orderId);
    // Balances finales
    const senderFinal = await usdt.balanceOf(sender.address);
    const receiverFinal = await usdt.balanceOf(receiver.address);
    const contractFinal = await usdt.balanceOf(paydeceEscrow.address);
    const feesAvailable = await paydeceEscrow.feesAvailable(usdt.address);
    // Chequeos
    expect(senderFinal).to.equal(senderInitial.sub(value).sub(senderfee));
    expect(receiverFinal).to.equal(receiverInitial.add(value.sub(receiverfee)));
    expect(contractFinal).to.equal(senderfee.add(receiverfee));
    expect(feesAvailable).to.equal(senderfee.add(receiverfee));
  });
}); 