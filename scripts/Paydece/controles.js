
async function main () {
    const address = '0xbe6FDB4Bcb82Ed31914F04Fa7ac2833d5ab0228E';
  
    const accounts = await ethers.getSigners()
    
    console.log(await accounts[0].address)
  
    const usdt = await ethers.getContractAt("USDTToken",address,accounts[0])
  
    //console.log('Transferring ...');  
    //await usdt.transfer('0x85e612e74d6C27A143f5223f0ae33C9dbb6774d4','105000000000000000000') ;
  
    var balance = await usdt.balanceOf('0xBc5A30aD804c5Ce662ab976Ca3d0Aa1935810712');
    console.log('Balances ',balance.toString());

    
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });