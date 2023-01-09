// scripts/upgrade.js
const { ethers } = require("hardhat");

async function main () {
  const newImplName = 'CriptoCarsEscrowV2';
  const NewImpl = await ethers.getContractFactory(newImplName);
  console.log(`Upgrading to ${newImplName}...`);
  await upgrades.upgradeProxy('0x581FC46e3511d21c9F7309DDBefB7854Eaf4120E', NewImpl);
  console.log(`CriptoCarsEscrowV2 upgraded to:`, newImplName);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
