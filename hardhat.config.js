require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@openzeppelin/hardhat-defender");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");

const mnemonic = process.env.MNEMONIC;
const mnemonic2 = process.env.MNEMONIC2;
const mnemonicpaydece = process.env.MNEMONICPAYDECE;
const mnemonic_mac1 = process.env.MNEMONIC3;
const infuraKey = process.env.INFURA_API_KEY;

const TESTNET_GAS_MULT = 1.1;

const { LINEASCAN_API_KEY } = process.env;

module.exports = {
  defender: {
    apiKey: process.env.DEFENDER_TEAM_API_KEY,
    apiSecret: process.env.DEFENDER_TEAM_API_SECRET_KEY,
  },
  networks: {
    ethereum: {
      url: `https://mainnet.infura.io/v3/${infuraKey}`,
      gasPrice: 24000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infuraKey}`,
      accounts: [mnemonic],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${infuraKey}`,
      gasMultiplier: 1,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    bsctestnet: {
      // url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      url: "https://data-seed-prebsc-1-s3.bnbchain.org:8545",
      chainId: 97,
      gasPrice: 3000000000,
      price: 3000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
      allowUnlimitedContractSize: true,
    },
    bscmainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    rskmainnet: {
      url: "https://public-node.rsk.co",
      chainId: 30,
      gasPrice: 65800000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    // rsktestnet: {
    //   url: "https://public-node.testnet.rsk.co/",
    //   chainId: 31,
    //   gasPrice: 20000000000,
    //   accounts: [mnemonic, mnemonic2,  mnemonic_mac1, mnemonicpaydece],
    // },
    rsktestnet: {
      chainId: 31,
      url: "https://public-node.testnet.rsk.co/",
      gasPrice: 65800000, //Math.floor(minimumGasPriceTestnet * TESTNET_GAS_MULT),
      gasMultiplier: TESTNET_GAS_MULT,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
      // accounts: {
      //   mnemonic: mnemonicpaydece,
      //   initialIndex: 0,
      //   path: "m/44'/60'/0'/0",
      //   count: 10,
      // },
    },
    polygontest: {
      url: "https://rpc-mumbai.maticvigil.com/",
      chainId: 80001,
      gasPrice: 25000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    polygonmain: {
      url: "https://polygon-rpc.com/",
      chainId: 137,
      gasPrice: 70000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [
        "480b7b4fb4bcf6752c4f7b385ad5fbf20029d38c903903295c75e9e3d4f9609b",
        "c03b4719a0ef66ff9323d971d14a2cb87f49b6fcc05818cf9d65118beb46fc43",
      ],
    },
    latestnet: {
      url: "https://rpc.testnet.lachain.network",
      chainId: 418,
      gasPrice: 20000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    lachain: {
      url: "https://rpc1.mainnet.lachain.network",
      chainId: 274,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    op: {
      url: "https://optimism.llamarpc.com",
      chainId: 10,
      gasPrice: 91000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    opgoerli: {
      url: "https://goerli.optimism.io",
      chainId: 420,
      gasPrice: 10000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    snowtrace: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      gasPrice: 27000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    snowtracetest: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      gasPrice: 27000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    arbitrum: {
      url: "https://arbitrum.llamarpc.com",
      chainId: 42161,
      gasPrice: 200000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    arbitrumtest: {
      url: "https://goerli-rollup.arbitrum.io/rpc",
      chainId: 421613,
      gasPrice: 2000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    fuse: {
      url: "https://rpc.fuse.io",
      chainId: 122,
      gasPrice: 11020000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    spark: {
      url: "https://rpc.fusespark.io",
      chainId: 123,
      gasPrice: 11020000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    linea_testnet: {
      url: `https://rpc.goerli.linea.build/`,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    linea_mainnet: {
      url: `https://rpc.linea.build/`,
      gasPrice: 4400000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    polygonAmoy: {
      url: `https://rpc-amoy.polygon.technology/`,
      chainId: 80002,
      gasPrice: 2000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },    
    base_mainnet: {
      url: `https://mainnet.base.org/`,
      chainId: 8453,
      gasPrice: 2000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
    base_sepolia: {
      url: `https://sepolia.base.org/`,
      chainId: 84532,
      gasPrice: 2000000000,
      accounts: [mnemonic, mnemonic2, mnemonic_mac1, mnemonicpaydece],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://bscscan.com/
    apiKey: "SBBBTAP79DSD3YIAQJVPDIJE13CVMG8A9K", //BSC Binance
    //apiKey: "WR353HZ9P2IKRW6NBJZ7BF5N8KXKRS46TN", //ETH
    //apiKey: "HQQ4FH84PNC244F6WVEA72G73SJS96ZSGC", //Polygon
    //apiKey: "BCMW9FNGPGE3VMH43IAKYWCUY8GM6YQRT6", //OP Goerli
    // apiKey: {
    //   lachain: "abc"
    // },
    // customChains: [
    //   // {
    //   //   network: "latestnet",
    //   //   chainId: 418,
    //   //   urls: {
    //   //     apiURL: "https://testexplorer.lachain.network/api",
    //   //     browserURL: "https://testexplorer.lachain.network"
    //   //   }
    //   // },
    //   {
    //     network: "lachain",
    //     chainId: 274,
    //     urls: {
    //       apiURL: "https://explorer.lachain.network/api",
    //       browserURL: "https://explorer.lachain.network"
    //     }
    //   }
    // ],
    // apiKey: {
    //   snowtrace: "snowtrace", // apiKey is not required, just set a placeholder
    // },
    // customChains: [
    //   {
    //     network: "snowtrace",
    //     chainId: 43113,
    //     urls: {
    //       apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
    //       browserURL: "https://avalanche.testnet.routescan.io"
    //     }
    //   }
    // ]
    // apiKey: {
    //   fuse: "YOUR_KEY_IF_YOU_HAVE_ONE",
    //   spark: "YOUR_KEY_IF_YOU_HAVE_ONE",
    // },
    // customChains: [
    //   {
    //     network: "fuse",
    //     chainId: 122,
    //     urls: {
    //       apiURL: "https://explorer.fuse.io/api",
    //       browserURL: "https://explorer.fuse.io",
    //     },
    //   },
    //   {
    //     network: "spark",
    //     chainId: 123,
    //     urls: {
    //       apiURL: "https://explorer.fusespark.io/api",
    //       browserURL: "https://explorer.fusespark.io",
    //     },
    //   },
    // ],
  //   apiKey: {
  //     linea_mainnet: LINEASCAN_API_KEY,
  //     polygonAmoy: process.env.POLYGONSCAN_API_KEY,
  //     base_sepolia: "VV73AHKSAD3PY59BPPZY8AS9ISMHEM839R",
  //     base_mainnet: "VV73AHKSAD3PY59BPPZY8AS9ISMHEM839R",
  //     lachain: "abc",
  //     bsctestnet: "SBBBTAP79DSD3YIAQJVPDIJE13CVMG8A9K",
  //   },
  //   customChains: [
  //     {
  //       network: "lachain",
  //       chainId: 274,
  //       urls: {
  //         apiURL: "https://explorer.lachain.network/api",
  //         browserURL: "https://explorer.lachain.network"
  //       }
  //     },
  //     {
  //       network: "linea_testnet",
  //       chainId: 59140,
  //       urls: {
  //         apiURL: "https://api-testnet.lineascan.build/api",
  //         browserURL: "https://goerli.lineascan.build/address",
  //       },
  //     },
  //     {
  //       network: "linea_mainnet",
  //       chainId: 59144,
  //       urls: {
  //         apiURL: "https://api.lineascan.build/api",
  //         browserURL: "https://lineascan.build/",
  //       },
  //     },
  //     {
  //       network: "polygonAmoy",
  //       chainId: 80002,
  //       urls: {
  //         apiURL: "https://api-amoy.polygonscan.com/api",
  //         browserURL: "https://amoy.polygonscan.com",
  //       },
  //     },
  //     {
  //       network: "base_sepolia",
  //       chainId: 84532,
  //       urls: {
  //         apiURL: "https://api-sepolia.basescan.org/api",
  //         browserURL: "https://basescan.org",
  //       },
  //     },
  //     {
  //       network: "base_mainnet",
  //       chainId: 8453,
  //       urls: {
  //         apiURL: "https://api.basescan.org/api",
  //         browserURL: "https://basescan.org",
  //       },
  //     },
  //   ],
  // },
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
