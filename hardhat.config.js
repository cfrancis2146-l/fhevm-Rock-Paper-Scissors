require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("hardhat-deploy");
require("@fhevm/hardhat-plugin");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  
  defaultNetwork: "hardhat",
  
  networks: {
    // 本地开发网络
    hardhat: {
      chainId: 31337,
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    
    // Sepolia 测试网（主 RPC 端点）
    sepolia: {
      url: process.env.SEPOLIA_RPC || `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
      gasPrice: "auto",
    },
    
    // Sepolia 备用 RPC 端点
    sepolia_alchemy: {
      url: "https://eth-sepolia.g.alchemy.com/v2/demo",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
      gasPrice: "auto",
    },
    
    sepolia_ankr: {
      url: "https://rpc.ankr.com/eth_sepolia",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
      gasPrice: "auto",
    },
    
    sepolia_public: {
      url: "https://sepolia.drpc.org",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
      gasPrice: "auto",
    },
    
    sepolia_1rpc: {
      url: "https://1rpc.io/sepolia",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
      gasPrice: "auto",
    },
  },
  
  // 命名账户配置
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  
  // 路径配置
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
  },
  
  // Etherscan 验证配置
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  
  // TypeChain 配置
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};
