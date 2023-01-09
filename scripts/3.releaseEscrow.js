
async function main () {
    const address = '0x635Fa70d506E77D2D03C29da8FcC34648BfC9f01';
  
    const accounts = await ethers.getSigners()
    
    const escrow = await ethers.getContractAt("CriptoCarsEscrow",address,accounts[1])
  
     await escrow.releaseEscrow(1);
    
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