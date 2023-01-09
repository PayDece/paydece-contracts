
async function main () {
    const address = '0xbe6FDB4Bcb82Ed31914F04Fa7ac2833d5ab0228E';
  
    const accounts = await ethers.getSigners()
    console.log(await accounts[1].address)
  
    //const usdt = await ethers.getContractFactory("USDTToken",address);

    //const usdt = await ethers.getContractAt("USDTToken",address)

    // const MyContract = await ethers.getContractFactory("USDTToken");
    // const usdt = new ethers.Contract(MyContract, MyContract.interface, accounts[1]);

    const usdt = await ethers.getContractAt("USDTToken",address,accounts[1])


////const usdt = await ethers.Contract(MyContract, MyContract.interface, accounts[0]);
  
    console.log(await usdt.decimals());
  
    //await usdt.transfer('0xBc5A30aD804c5Ce662ab976Ca3d0Aa1935810712', '1', { from: accounts[1].address});
    await usdt.approve('0x280bb3710c9126B7FBd22941a68a2b3CC4cc8Ef1',105);
  
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