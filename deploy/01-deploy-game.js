/**
 * 部署 RockPaperScissors 合约
 * 
 * 使用方法：
 * npx hardhat deploy --network sepolia
 */

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    
    console.log("\n🚀 开始部署 RockPaperScissorsFHE...");
    console.log("📍 部署账户:", deployer);
    
    // 获取账户余额
    const balance = await ethers.provider.getBalance(deployer);
    console.log("💰 账户余额:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
        throw new Error(
            "❌ 账户余额不足！\n" +
            "请访问 https://sepoliafaucet.com/ 获取 Sepolia ETH"
        );
    }
    
    // 部署合约
    const deployment = await deploy("RockPaperScissorsFHE", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: 2,
    });
    
    console.log("\n✅ 合约部署成功！");
    console.log("📍 合约地址:", deployment.address);
    console.log("📜 交易哈希:", deployment.transactionHash);
    
    // 获取合约实例
    const contract = await ethers.getContractAt("RockPaperScissorsFHE", deployment.address);
    
    // 显示合约配置
    const entryFee = await contract.entryFee();
    const rewardMultiplier = await contract.rewardMultiplier();
    
    console.log("\n📊 合约配置：");
    console.log("   入场费:", ethers.formatEther(entryFee), "ETH");
    console.log("   奖励倍数:", rewardMultiplier.toString() + "% (即 " + (Number(rewardMultiplier) / 100) + "x)");
    
    console.log("\n🎮 下一步：");
    console.log("1. 向合约充值: npx hardhat run scripts/fund-contract.js --network sepolia");
    console.log("2. 测试游戏: npx hardhat run scripts/test-game.js --network sepolia");
    
    return true;
};

module.exports.id = "deploy_rock_paper_scissors_fhe";
module.exports.tags = ["all", "game"];

