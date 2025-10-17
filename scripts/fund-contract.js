const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("💰 Funding RockPaperScissors Contract");
  console.log("---------------------------------------------------");

  // 从部署文件读取合约地址
  const network = hre.network.name;
  let contractAddress;
  
  // 尝试多个可能的部署文件位置
  const possiblePaths = [
    path.join(__dirname, "..", "deployment-fhe.json"),
    path.join(__dirname, "..", "deployments", network, "RockPaperScissorsFHE.json"),
    path.join(__dirname, "..", "deployment.json")
  ];
  
  for (const deploymentPath of possiblePaths) {
    if (fs.existsSync(deploymentPath)) {
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      contractAddress = deploymentInfo.address || deploymentInfo.contractAddress;
      console.log("📄 Using deployment file:", deploymentPath);
      break;
    }
  }
  
  if (!contractAddress) {
    console.error("❌ Deployment info not found. Please deploy the contract first.");
    console.error("   Run: npx hardhat run scripts/deploy-fhe-sepolia.js --network " + network);
    process.exit(1);
  }

  console.log("📍 Contract Address:", contractAddress);
  console.log("🌐 Network:", network);

  // 获取签名者
  const [signer] = await hre.ethers.getSigners();
  console.log("📍 Funding from:", signer.address);

  // 检查余额
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("💰 Your balance:", hre.ethers.formatEther(balance), "ETH");

  // 设置资金金额 - 0.5 ETH
  const fundAmount = hre.ethers.parseEther("0.5");
  console.log("💸 Funding amount:", hre.ethers.formatEther(fundAmount), "ETH");

  if (balance < fundAmount) {
    console.error("❌ Insufficient balance to fund the contract");
    process.exit(1);
  }

  // 发送ETH到合约
  console.log("\n⏳ Sending ETH to contract...");
  const tx = await signer.sendTransaction({
    to: contractAddress,
    value: fundAmount,
  });

  console.log("📝 Transaction hash:", tx.hash);
  await tx.wait();

  // 检查合约余额
  const contractBalance = await hre.ethers.provider.getBalance(contractAddress);
  console.log("\n✅ Contract funded successfully!");
  console.log("💰 Contract balance:", hre.ethers.formatEther(contractBalance), "ETH");
  console.log("---------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Funding failed:");
    console.error(error);
    process.exit(1);
  });

