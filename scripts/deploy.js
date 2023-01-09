// scripts/deploy.js
async function main () {
  const CriptoCarsEscrow = await ethers.getContractFactory('CriptoCarsEscrow');
  console.log('Deploying CriptoCarsEscrow...');
  const criptoCarsEscrow = await upgrades.deployProxy(CriptoCarsEscrow, {
    initializer: "initialize",
  });
  await criptoCarsEscrow.deployed();
  console.log('Box deployed to:', criptoCarsEscrow.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
