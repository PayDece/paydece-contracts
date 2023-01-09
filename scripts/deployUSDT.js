// scripts/deployUSDT.js
async function main () {
    console.log('Deploying CriptoCarsEscrow...');
    const USDT = await ethers.getContractFactory('USDTToken');
    console.log('Deploying USDTToken...');
    const usdt = await USDT.deploy();
    await usdt.deployed();
    console.log('USDT deployed to:', usdt.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  