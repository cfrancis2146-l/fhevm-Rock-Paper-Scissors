const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of RockPaperScissors contract...");
  console.log("---------------------------------------------------");

  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from account:", deployer.address);

  // 获取账户余额
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("🌐 Network:", hre.network.name);
  console.log("---------------------------------------------------");

  // 部署合约
  console.log("\n⏳ Deploying RockPaperScissors contract...");
  const RockPaperScissors = await hre.ethers.getContractFactory("RockPaperScissors");
  const rps = await RockPaperScissors.deploy();

  await rps.waitForDeployment();
  const contractAddress = await rps.getAddress();

  console.log("✅ RockPaperScissors deployed to:", contractAddress);
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
  };

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // 保存前端配置
  const frontendConfigPath = path.join(__dirname, "..", "frontend", "js", "contract-config.js");
  const frontendConfig = `// Auto-generated contract configuration
// Generated at: ${new Date().toISOString()}

const CONTRACT_CONFIG = {
  address: "${contractAddress}",
  network: "${hre.network.name}",
  chainId: ${hre.network.config.chainId},
  entryFee: "${hre.ethers.formatEther(entryFee)}",
  rewardMultiplier: ${rewardMultiplier.toString()},
};

// Contract ABI (simplified - only the functions we need)
const CONTRACT_ABI = [
  "function playGame(bytes encryptedChoice, bytes inputProof) payable returns (uint256)",
  "function settleGame(uint256 gameId, uint8 decryptedChoice) external",
  "function claimReward(uint256 gameId) external",
  "function claimMultipleRewards(uint256[] gameIds) external",
  "function getGame(uint256 gameId) view returns (tuple(uint256 gameId, address player, uint8 playerChoice, uint8 systemChoice, uint8 result, uint256 betAmount, uint256 reward, uint256 timestamp, bool settled, bool rewarded))",
  "function getPlayerGames(address player) view returns (uint256[])",
  "function getPlayerGameDetails(address player) view returns (tuple(uint256 gameId, address player, uint8 playerChoice, uint8 systemChoice, uint8 result, uint256 betAmount, uint256 reward, uint256 timestamp, bool settled, bool rewarded)[])",
  "function getGameCount() view returns (uint256)",
  "function getChoiceName(uint8 choice) pure returns (string)",
  "function getResultName(uint8 result) pure returns (string)",
  "function entryFee() view returns (uint256)",
  "function rewardMultiplier() view returns (uint256)",
  "function getContractBalance() view returns (uint256)",
  "event GameCreated(uint256 indexed gameId, address indexed player, uint256 betAmount, uint256 timestamp)",
  "event GameSettled(uint256 indexed gameId, address indexed player, uint8 playerChoice, uint8 systemChoice, uint8 result, uint256 timestamp)",
  "event RewardClaimed(uint256 indexed gameId, address indexed player, uint256 reward)"
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

  console.log("\n🎉 Deployment completed successfully!");
  console.log("---------------------------------------------------");
  console.log("\n📝 Next steps:");
  console.log("1. Update your .env file with the contract address");
  console.log("2. Verify the contract on Etherscan (if on public network)");
  console.log("3. Fund the contract with ETH for rewards");
  console.log("4. Open frontend/index.html to start playing!");
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

