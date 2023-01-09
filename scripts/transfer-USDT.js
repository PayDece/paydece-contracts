
async function main () {
  // const address = '0x027162b525Af40d685ef00aFDD00801Cd6B26c29';
  const address = '0xf9dCFC25C79FC0fEcA86FBdEAEC050d2A2BFeB7E';

  const accounts = await ethers.getSigners()

  // 0xeaE63Be8a766Bd49B734a9203A1Aa3Ae48ddf53C
  // const wallet = new Wallet( '0xeaE63Be8a766Bd49B734a9203A1Aa3Ae48ddf53C');

  console.log(await accounts[0].address)

  const usdt = await ethers.getContractAt("USDTToken",address,accounts[0])
  //console.log(await usdt.decimals())
  
  // console.log('Transferring ...');

  await usdt.transfer('0x0f43EB2E71833319896B01e2412E07A0bb5e5a9d','105000000000000000000') ;

  var balance = await usdt.balanceOf('0xeaE63Be8a766Bd49B734a9203A1Aa3Ae48ddf53C');
  console.log(balance.toString());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });