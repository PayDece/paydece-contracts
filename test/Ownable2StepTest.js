const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaydeceEscrow Ownable2Step", function () {
    let paydeceEscrow;
    let owner, newOwner, otherAccount;

    beforeEach(async function () {
        [owner, newOwner, otherAccount] = await ethers.getSigners();
        
        const PaydeceEscrow = await ethers.getContractFactory("PaydeceEscrow");
        paydeceEscrow = await PaydeceEscrow.deploy(owner.address);
        await paydeceEscrow.deployed();
    });

    describe("Ownable2Step functionality", function () {
        it("Should have the deployer as initial owner", async function () {
            expect(await paydeceEscrow.owner()).to.equal(owner.address);
        });

        it("Should have no pending owner initially", async function () {
            expect(await paydeceEscrow.pendingOwner()).to.equal(ethers.constants.AddressZero);
        });

        it("Should start ownership transfer when transferOwnership is called", async function () {
            await paydeceEscrow.transferOwnership(newOwner.address);
            
            expect(await paydeceEscrow.owner()).to.equal(owner.address);
            expect(await paydeceEscrow.pendingOwner()).to.equal(newOwner.address);
        });

        it("Should emit OwnershipTransferStarted when transferOwnership is called", async function () {
            await expect(paydeceEscrow.transferOwnership(newOwner.address))
                .to.emit(paydeceEscrow, "OwnershipTransferStarted")
                .withArgs(owner.address, newOwner.address);
        });

        it("Should complete ownership transfer when acceptOwnership is called by pending owner", async function () {
            await paydeceEscrow.transferOwnership(newOwner.address);
            await paydeceEscrow.connect(newOwner).acceptOwnership();
            
            expect(await paydeceEscrow.owner()).to.equal(newOwner.address);
            expect(await paydeceEscrow.pendingOwner()).to.equal(ethers.constants.AddressZero);
        });

        it("Should emit OwnershipTransferred when acceptOwnership is called", async function () {
            await paydeceEscrow.transferOwnership(newOwner.address);
            
            await expect(paydeceEscrow.connect(newOwner).acceptOwnership())
                .to.emit(paydeceEscrow, "OwnershipTransferred")
                .withArgs(owner.address, newOwner.address);
        });

        it("Should revert when non-pending owner tries to accept ownership", async function () {
            await paydeceEscrow.transferOwnership(newOwner.address);
            
            // Using a more compatible way to test custom errors for older Hardhat versions
            try {
                await paydeceEscrow.connect(otherAccount).acceptOwnership();
                expect.fail("Expected transaction to revert");
            } catch (error) {
                expect(error.message).to.include("OwnableUnauthorizedAccount");
            }
        });

        it("Should revert when non-owner tries to transfer ownership", async function () {
            try {
                await paydeceEscrow.connect(otherAccount).transferOwnership(newOwner.address);
                expect.fail("Expected transaction to revert");
            } catch (error) {
                expect(error.message).to.include("OwnableUnauthorizedAccount");
            }
        });

        it("Should prevent renouncing ownership", async function () {
            try {
                await paydeceEscrow.renounceOwnership();
                expect.fail("Expected transaction to revert");
            } catch (error) {
                expect(error.message).to.include("RenounceOwnershipDisabled");
            }
        });

        it("Should allow replacing pending owner before acceptance", async function () {
            const thirdAccount = (await ethers.getSigners())[3];
            
            await paydeceEscrow.transferOwnership(newOwner.address);
            expect(await paydeceEscrow.pendingOwner()).to.equal(newOwner.address);
            
            await paydeceEscrow.transferOwnership(thirdAccount.address);
            expect(await paydeceEscrow.pendingOwner()).to.equal(thirdAccount.address);
        });

        it("Should allow transferring to zero address (cancels transfer)", async function () {
            // In OpenZeppelin v5, transferring to zero address is allowed to cancel transfers
            await expect(paydeceEscrow.transferOwnership(ethers.constants.AddressZero))
                .to.emit(paydeceEscrow, "OwnershipTransferStarted")
                .withArgs(owner.address, ethers.constants.AddressZero);
            
            expect(await paydeceEscrow.pendingOwner()).to.equal(ethers.constants.AddressZero);
        });

        it("Should allow transferring to current owner (no-op transfer)", async function () {
            // In OpenZeppelin v5, transferring to current owner is allowed
            await expect(paydeceEscrow.transferOwnership(owner.address))
                .to.emit(paydeceEscrow, "OwnershipTransferStarted")
                .withArgs(owner.address, owner.address);
            
            expect(await paydeceEscrow.pendingOwner()).to.equal(owner.address);
        });

        it("Should cancel pending transfer by transferring to zero address", async function () {
            // First set a pending owner
            await paydeceEscrow.transferOwnership(newOwner.address);
            expect(await paydeceEscrow.pendingOwner()).to.equal(newOwner.address);
            
            // Cancel by transferring to zero address (OpenZeppelin v5 behavior)
            await paydeceEscrow.transferOwnership(ethers.constants.AddressZero);
            expect(await paydeceEscrow.pendingOwner()).to.equal(ethers.constants.AddressZero);
        });
    });
});