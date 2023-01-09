async function main () {
    const address = '0x006989d8E4BD769a55F64b35cC374594B4a3c82a'; //Address Escrow
  
    const accounts = await ethers.getSigners()
    
    const escrow = await ethers.getContractAt("PaydeceEscrow",address,accounts[0])
  
    console.log( await escrow.version());

    console.log("Procesando releaseEscrow...");
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