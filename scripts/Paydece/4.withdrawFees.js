async function main () {
    const address = '0xAe4A02B8480b916dB3E603897eE547C9a401942a'; //Address Escrow
  
    const accounts = await ethers.getSigners()
    
    const escrow = await ethers.getContractAt("PaydeceEscrow",address,accounts[0])
  
    console.log( await escrow.version());

    console.log("Procesando withdrawFees...");
    await escrow.withdrawFees('0x3Fc7d86C8E944FA2f16BC676fab16b41132E52e7','10000000000000000000');    
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