
async function main () {
    const address = '0x55d398326f99059fF775485246999027B3197955'; //Stable
  
    const accounts = await ethers.getSigners()
    //  console.log(await accounts[0].address)
    // console.log(await accounts[1].address)
    // console.log(await accounts[2].address)
    // console.log(await accounts[3].address)
  
    const usdt = await ethers.getContractAt("USDTToken",address,accounts[3])

    console.log(await usdt.decimals());
  
    // await usdt.approve('0x006989d8E4BD769a55F64b35cC374594B4a3c82a','1000000');

    console.log(await usdt.allowance( '0x88eBF0236faB31b5085B963F176FE654a644d688',accounts[3].address));

    // Aprobar la transferencia desde el contrato
    const tx1 = await usdt.approve(accounts[3].address, '10000000000000000000');
     await tx1.wait();

    console.log(await usdt.allowance( '0x88eBF0236faB31b5085B963F176FE654a644d688',accounts[3].address));

    // Transferir los fondos desde el contrato
    //  const tx2 = await usdt.transferFrom('0x88eBF0236faB31b5085B963F176FE654a644d688', accounts[3].address, 1);
    //  await tx2.wait();
  
    console.log("Termino");
    // var balance = await usdt.balanceOf('0xBc5A30aD804c5Ce662ab976Ca3d0Aa1935810712');
    // console.log(balance.toString());
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
// npx hardhat run --network bscmainnet ./scripts/refundUSDT.js    