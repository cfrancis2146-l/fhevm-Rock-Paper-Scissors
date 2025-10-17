/**
 * 独立充值脚本 - 向任意合约地址充值
 * 
 * 使用方法：
 * npx hardhat run scripts/fund.js --network sepolia
 * 
 * 可以修改下面的配置：
 * - CONTRACT_ADDRESS: 合约地址
 * - FUND_AMOUNT: 充值金额（ETH）
 */

const hre = require("hardhat");

// ========== 配置区域 ==========
const CONTRACT_ADDRESS = "0x013E4F0Cd28D3c729A7c6884Ed2c40b411B1dbf0"; // 您的合约地址
const FUND_AMOUNT = "0.8"; // 充值金额（ETH）
// ==============================

async function main() {
  console.log("\n💰 合约充值工具");
  console.log("=".repeat(60));

  // 获取签名者
  const [signer] = await hre.ethers.getSigners();
  
  console.log("\n📊 充值信息：");
  console.log("   网络:", hre.network.name);
  console.log("   合约地址:", CONTRACT_ADDRESS);
  console.log("   充值金额:", FUND_AMOUNT, "ETH");
  console.log("   发送账户:", signer.address);

  // 检查账户余额
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("   账户余额:", hre.ethers.formatEther(balance), "ETH");

  const fundAmount = hre.ethers.parseEther(FUND_AMOUNT);
  
  if (balance < fundAmount) {
    console.error("\n❌ 账户余额不足！");
    console.error("   需要:", FUND_AMOUNT, "ETH");
    console.error("   当前:", hre.ethers.formatEther(balance), "ETH");
    process.exit(1);
  }

  // 检查合约当前余额
  const contractBalanceBefore = await hre.ethers.provider.getBalance(CONTRACT_ADDRESS);
  console.log("   合约当前余额:", hre.ethers.formatEther(contractBalanceBefore), "ETH");

  // 发送ETH到合约
  console.log("\n⏳ 正在发送交易...");
  const tx = await signer.sendTransaction({
    to: CONTRACT_ADDRESS,
    value: fundAmount,
  });

  console.log("📝 交易哈希:", tx.hash);
  console.log("⏳ 等待确认...");
  
  const receipt = await tx.wait();
  console.log("✅ 交易已确认！区块号:", receipt.blockNumber);

  // 检查合约充值后余额
  const contractBalanceAfter = await hre.ethers.provider.getBalance(CONTRACT_ADDRESS);
  const accountBalanceAfter = await hre.ethers.provider.getBalance(signer.address);

  console.log("\n💰 充值结果：");
  console.log("   合约余额变化:", 
    hre.ethers.formatEther(contractBalanceBefore), "ETH →",
    hre.ethers.formatEther(contractBalanceAfter), "ETH"
  );
  console.log("   增加:", hre.ethers.formatEther(contractBalanceAfter - contractBalanceBefore), "ETH");
  console.log("   您的账户余额:", hre.ethers.formatEther(accountBalanceAfter), "ETH");
  
  console.log("\n✅ 充值成功！");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 充值失败：");
    console.error(error);
    process.exit(1);
  });

