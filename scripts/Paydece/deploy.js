// scripts/deploy.js
async function main () {  
  const accounts = await ethers.getSigners()
  console.log(await accounts[0].address)
  
  const MyContract = await hre.ethers.getContractFactory("PaydeceEscrow",accounts[0]);

  //const my_contract = await MyContract.deploy("0xbe6FDB4Bcb82Ed31914F04Fa7ac2833d5ab0228E");
  const my_contract = await MyContract.deploy();

  await my_contract.deployed();

  console.log("PaydeceEscrow deployed to:", my_contract.address);


  // const CriptoCarsEscrow = await ethers.getContractFactory('PaydeceEscrow');
  // console.log('Deploying PaydeceEscrow...');
  // const criptoCarsEscrow = await upgrades.deployProxy(CriptoCarsEscrow, {
  //   initializer: "initialize",
  // });
  // await criptoCarsEscrow.deployed();
  // console.log('Box deployed to:', criptoCarsEscrow.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
