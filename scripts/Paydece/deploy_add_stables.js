async function main() {
  const address = "0xd4a5Bb96BDE96D2cE624101D40c0ffC1aA2C98E8"; //Address Escrow

  const accounts = await ethers.getSigners();

  const escrow = await ethers.getContractAt(
    "PaydeceEscrow",
    address,
    accounts[3]
  );

  console.log(accounts[3].address);
  console.log(await escrow.version());

  // POLYGON MAINNET
  // await escrow.addStablesAddresses(
  //   "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
  // );

  // await escrow.addStablesAddresses(
  //   "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
  // );

  // await escrow.addStablesAddresses(
  //   "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
  // );

  ////////////////////////////////////////////////////////////////////////////////
  // BSC MAIN
  // await escrow.addStablesAddresses(
  //   "0x55d398326f99059fF775485246999027B3197955"
  // );

  // await escrow.addStablesAddresses(
  //   "0x91bc956F064d755dB2e4EfE839eF0131e0b07E28"
  // );

  // await escrow.addStablesAddresses(
  //   "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3"
  // );

  ////////////////////////////////////////////////////////////////////////////////
  // ETHE MAIN
  await escrow.addStablesAddresses(
    "0x6b175474e89094c44da98b954eedeac495271d0f"
  );

  await escrow.addStablesAddresses(
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
  );

  await escrow.addStablesAddresses(
    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
  );

  //MUMBAY POLYGON
  // await escrow.addStablesAddresses(
  //   "0xdA447c3652AE842d8B322F019AD371f1f19a05Ea"
  // );

  // await escrow.addStablesAddresses(
  //   "0x8d6e6dB1242A6227445aFcc0b5Cc64639a0d5402"
  // );

  //console.log('Transferring ...');
  // createEscrow(uint _orderId, address payable _buyer, address payable _seller, uint _value, IERC20 _currency)

  //  await escrow.createEscrow(2, '0x0f43EB2E71833319896B01e2412E07A0bb5e5a9d','0x0f43EB2E71833319896B01e2412E07A0bb5e5a9d', '1','0x9DB70bE165d33E263861265477cC34cdD6106DCb');

  console.log("Termino");
  // var balance = await usdt.balanceOf('0xBc5A30aD804c5Ce662ab976Ca3d0Aa1935810712');
  // console.log(balance.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
