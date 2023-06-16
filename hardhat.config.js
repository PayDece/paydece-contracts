require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@openzeppelin/hardhat-defender");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");

const mnemonic = process.env.MNEMONIC;
const mnemonic2 = process.env.MNEMONIC2;
const mnemonicpaydece = process.env.MNEMONICPAYDECE;
const infuraKey = process.env.INFURA_API_KEY;

module.exports = {
  defender: {
    apiKey: process.env.DEFENDER_TEAM_API_KEY,
    apiSecret: process.env.DEFENDER_TEAM_API_SECRET_KEY,
  },
  networks: {
    ethereum: {
      url: `https://mainnet.infura.io/v3/${infuraKey}`,
      accounts: [mnemonic, mnemonic2, mnemonicpaydece],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infuraKey}`,
      accounts: [mnemonic],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${infuraKey}`,
      accounts: [mnemonic],
    },
    bsctestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [mnemonic, mnemonic2, mnemonicpaydece],
    },
    bscmainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [mnemonic, mnemonic2, mnemonicpaydece],
    },
    rsktestnet: {
      url: "https://public-node.testnet.rsk.co",
      chainId: 31,
      gasPrice: 20000000000,
      accounts: [mnemonic, mnemonic2],
    },
    polygontest: {
      url: "https://rpc-mumbai.maticvigil.com/",
      chainId: 80001,
      gasPrice: 20000000000,
      accounts: [mnemonic, mnemonic2],
    },
    polygonmain: {
      url: "https://polygon-rpc.com/",
      chainId: 137,
      gasPrice: 20000000000,
      accounts: [mnemonic, mnemonic2, mnemonicpaydece],
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [
        "480b7b4fb4bcf6752c4f7b385ad5fbf20029d38c903903295c75e9e3d4f9609b",
        "c03b4719a0ef66ff9323d971d14a2cb87f49b6fcc05818cf9d65118beb46fc43",
      ],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://bscscan.com/
    apiKey: "SBBBTAP79DSD3YIAQJVPDIJE13CVMG8A9K", //BSC Binance
    //apiKey: "WR353HZ9P2IKRW6NBJZ7BF5N8KXKRS46TN", //ETH Rinkeby
    //apiKey: "HQQ4FH84PNC244F6WVEA72G73SJS96ZSGC" //Pplygon
  },
  solidity: "0.8.7",
};
