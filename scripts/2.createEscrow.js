async function main () {
    const address = '0x9326a55CDB2c1c978e2dD23e4a1a36BCDc3F4698'; //Address Escrow
  
    const accounts = await ethers.getSigners()
    
    const escrow = await ethers.getContractAt("CriptoCarsEscrow",address,accounts[1])
  
    console.log( await escrow.version());

    //console.log('Transferring ...');
    // createEscrow(uint _orderId, address payable _buyer, address payable _seller, uint _value, IERC20 _currency)

     await escrow.createEscrow(1, '0xeaE63Be8a766Bd49B734a9203A1Aa3Ae48ddf53C','0xBc5A30aD804c5Ce662ab976Ca3d0Aa1935810712', 
                                    100000000000000000000,'0x556045DA4811B4100D106F6D1C90c5feeBc769Cb');
    

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