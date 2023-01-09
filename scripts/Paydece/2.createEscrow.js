async function main () {
    const address = '0x006989d8E4BD769a55F64b35cC374594B4a3c82a'; //Address Escrow
  
    const accounts = await ethers.getSigners()
    
    const escrow = await ethers.getContractAt("PaydeceEscrow",address,accounts[0])
  
    console.log( await escrow.version());

    //console.log('Transferring ...');
    // createEscrow(uint _orderId, address payable _buyer, address payable _seller, uint _value, IERC20 _currency)

     await escrow.createEscrow(2, '0x0f43EB2E71833319896B01e2412E07A0bb5e5a9d','0x0f43EB2E71833319896B01e2412E07A0bb5e5a9d', '1','0x9DB70bE165d33E263861265477cC34cdD6106DCb');
    

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