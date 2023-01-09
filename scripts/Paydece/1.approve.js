
async function main () {
    const address = '0x9DB70bE165d33E263861265477cC34cdD6106DCb'; //Stable
  
    const accounts = await ethers.getSigners()
    console.log(await accounts[0].address)
  
    const usdt = await ethers.getContractAt("USDTToken",address,accounts[0])

    console.log(await usdt.decimals());
  
    await usdt.approve('0x006989d8E4BD769a55F64b35cC374594B4a3c82a','1000000');


    // console.log(await usdt.allowance( accounts[1], '0xDD0FcA6EF735a2ECb19a6B84E97883282689EC64'));
  
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