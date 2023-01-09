const { expect } = require("chai");

describe("CriptoCarsEscrow", function() {
  // it("Should return the version 1.0", async function() {
  //   const CriptoCarsEscrow = await ethers.getContractFactory('CriptoCarsEscrow');
  //   console.log('Deploying CriptoCarsEscrow...');
  //   const criptoCarsEscrow = await upgrades.deployProxy(CriptoCarsEscrow, {
  //     initializer: "initialize",
  //   });
  //   await criptoCarsEscrow.deployed();
  //   expect(await criptoCarsEscrow.version()).to.equal("1.0.0");
  // });

  it("Should return without error", async function() {
    // const CriptoCarsEscrow = await ethers.getContractFactory('CriptoCarsEscrow');
    // console.log('Deploying CriptoCarsEscrow...');
    // const criptoCarsEscrow = await upgrades.deployProxy(CriptoCarsEscrow, {
    //   initializer: "initialize",
    // });
    // await criptoCarsEscrow.deployed();

    const addressCriptoCarsEscrow = '0xdD589b1A88F3f32e29b92A694dB8d383004D9Fbf';
    const criptoCarsEscrow = await ethers.getContractAt("CriptoCarsEscrow",addressCriptoCarsEscrow);

    const accounts = await ethers.provider.listAccounts();
    // console.log(accounts);
    // console.log(accounts[1]);

     let contract_owner = await ethers.getSigner(accounts[1]);
    // console.log(contract_owner);

    const address = '0x757B362cAc93F472DaA6FaBf7F5Ea48710d1eB9F';
    const usdt = await ethers.getContractAt("USDTToken",address)

    //Aprueba la transaferencia de tokens de USDT al Escrow
    var bln = await usdt.connect(contract_owner).approve(criptoCarsEscrow.address, 1000);
    // console.log(bln.toString());

    var _state = await criptoCarsEscrow.getState(2)    
    console.log("Antes "+_state.toString());
    
    //Se crea el scrow desde la cuanta que vende.
    await criptoCarsEscrow.connect(contract_owner).createEscrow(2, accounts[1], accounts[2], 
                                             1, 0, 0, '0x757B362cAc93F472DaA6FaBf7F5Ea48710d1eB9F');

     _state = await criptoCarsEscrow.getState(2)                 
    console.log("Despues "+_state.toString());
  });
});
