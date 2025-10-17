const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// 重试函数
async function retryOperation(operation, maxRetries = 3, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`❌ Attempt ${i + 1} failed:`, error.message);
      if (i === maxRetries - 1) throw error;
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // 指数退避
    }
  }
}

async function main() {
  console.log("🚀 Starting deployment of RockPaperScissorsFHE contract...");
  console.log("---------------------------------------------------");

  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from account:", deployer.address);

  // 获取账户余额
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("🌐 Network:", hre.network.name);
  console.log("---------------------------------------------------");

  // 部署合约（带重试机制）
  console.log("\n⏳ Deploying RockPaperScissorsFHE contract...");
  
  const deployContract = async () => {
    const RockPaperScissorsFHE = await hre.ethers.getContractFactory("RockPaperScissorsFHE");
    
    // 设置 gas 参数
    const feeData = await hre.ethers.provider.getFeeData();
    const gasLimit = 5000000; // 设置较高的 gas limit
    
    console.log("⛽ Gas Price:", hre.ethers.formatUnits(feeData.gasPrice, "gwei"), "Gwei");
    console.log("⛽ Gas Limit:", gasLimit);
    
    const rps = await RockPaperScissorsFHE.deploy({
      gasLimit: gasLimit,
      gasPrice: feeData.gasPrice
    });

    await rps.waitForDeployment();
    return rps;
  };

  const rps = await retryOperation(deployContract);
  const contractAddress = await rps.getAddress();

  console.log("✅ RockPaperScissorsFHE deployed to:", contractAddress);
  console.log("---------------------------------------------------");

  // 获取合约信息
  const entryFee = await rps.entryFee();
  const rewardMultiplier = await rps.rewardMultiplier();
  const owner = await rps.owner();

  console.log("\n📋 Contract Configuration:");
  console.log("  - Entry Fee:", hre.ethers.formatEther(entryFee), "ETH");
  console.log("  - Reward Multiplier:", rewardMultiplier.toString() + "/100 (=" + (Number(rewardMultiplier) / 100) + "x)");
  console.log("  - Owner:", owner);
  console.log("---------------------------------------------------");

  // 保存部署信息
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    entryFee: entryFee.toString(),
    rewardMultiplier: rewardMultiplier.toString(),
    deploymentTime: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    contractType: "RockPaperScissorsFHE"
  };

  const deploymentPath = path.join(__dirname, "..", "deployment-fhe.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // 保存前端配置
  const frontendConfigPath = path.join(__dirname, "..", "frontend", "js", "contract-config-fhe.js");
  const frontendConfig = `// Auto-generated FHE contract configuration
// Generated at: ${new Date().toISOString()}

const CONTRACT_CONFIG = {
  address: "${contractAddress}",
  network: "${hre.network.name}",
  chainId: ${hre.network.config.chainId},
  entryFee: "${hre.ethers.formatEther(entryFee)}",
  rewardMultiplier: ${rewardMultiplier.toString()},
  contractType: "RockPaperScissorsFHE"
};

// Contract ABI (simplified - only the functions we need for FHE)
const CONTRACT_ABI = [
  "function playGame(externalEuint8 inputEuint8, bytes calldata inputProof) payable returns (uint256)",
  "function settleGame(uint256 gameId, uint8 decryptedPlayerChoice, uint8 decryptedSystemChoice, uint8 decryptedResult) external",
  "function claimReward(uint256 gameId) external",
  "function claimMultipleRewards(uint256[] gameIds) external",
  "function getGame(uint256 gameId) view returns (tuple(uint256 gameId, address player, uint8 decryptedPlayerChoice, uint8 decryptedSystemChoice, uint8 finalResult, uint256 betAmount, uint256 reward, uint256 timestamp, bool settled, bool rewarded))",
  "function getPlayerGames(address player) view returns (uint256[])",
  "function getGameCount() view returns (uint256)",
  "function getChoiceName(uint8 choice) pure returns (string)",
  "function getResultName(uint8 result) pure returns (string)",
  "function entryFee() view returns (uint256)",
  "function rewardMultiplier() view returns (uint256)",
  "function getContractBalance() view returns (uint256)",
  "event GameCreated(uint256 indexed gameId, address indexed player, uint256 betAmount, uint256 timestamp)",
  "event GameSettled(uint256 indexed gameId, address indexed player, uint8 playerChoice, uint8 systemChoice, uint8 result, uint256 timestamp)",
  "event RewardClaimed(uint256 indexed gameId, address indexed player, uint256 reward)",
  "event DecryptionRequested(uint256 indexed gameId, address indexed player)"
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONTRACT_CONFIG, CONTRACT_ABI };
}
`;

  // 确保前端目录存在
  const frontendJsDir = path.join(__dirname, "..", "frontend", "js");
  if (!fs.existsSync(frontendJsDir)) {
    fs.mkdirSync(frontendJsDir, { recursive: true });
  }

  fs.writeFileSync(frontendConfigPath, frontendConfig);
  console.log("💾 Frontend config saved to:", frontendConfigPath);

  console.log("\n🎉 FHE Contract deployment completed successfully!");
  console.log("---------------------------------------------------");
  console.log("\n📝 Next steps:");
  console.log("1. Update your .env file with the contract address");
  console.log("2. Verify the contract on Etherscan (if on public network)");
  console.log("3. Fund the contract with ETH for rewards");
  console.log("4. Test the FHE functionality with the play-game-sepolia.js script");
  console.log("\n🔗 Contract Address:", contractAddress);
  console.log("---------------------------------------------------");
}

// 执行部署
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
