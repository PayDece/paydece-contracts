async function main() {
  const address = "0xd509FBf7f5162ef35491b0344f322cb765505E29"; //Address Escrow

  const accounts = await ethers.getSigners();

  const escrow = await ethers.getContractAt(
    "PaydeceEscrow",
    address,
    accounts[3]
  );

  console.log(await escrow.version());

  // BSC TESTNET
  await escrow.addStablesAddresses(
    "0xbe6fdb4bcb82ed31914f04fa7ac2833d5ab0228e"
  );

  await escrow.addStablesAddresses(
    "0x960d266feab590a88e9d2de0198e00fdaade033b"
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
