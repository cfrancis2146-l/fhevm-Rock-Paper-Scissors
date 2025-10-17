/**
 * 领取游戏奖励脚本
 * 
 * 使用方法:
 * npx hardhat run scripts/claim-reward.js --network sepolia [gameId]
 * 
 * 示例:
 * npx hardhat run scripts/claim-reward.js --network sepolia 0
 */

const hre = require("hardhat");
const { ethers } = hre;

// 合约地址
const contractAddress = "0x788802111D8906fbc839A4B63d7a993997040A3e";

async function main() {
    try {
        console.log("💰 开始领取游戏奖励");
        console.log("=".repeat(60));

        // 1. 获取游戏 ID
        const gameId = process.argv[2] ? parseInt(process.argv[2]) : 0;
        console.log(`\n📋 游戏 ID: ${gameId}`);

        // 2. 获取签名者
        const [player] = await ethers.getSigners();
        console.log(`✅ 玩家地址: ${player.address}`);
        
        const balanceBefore = await ethers.provider.getBalance(player.address);
        console.log(`   当前余额: ${ethers.formatEther(balanceBefore)} ETH`);

        // 3. 连接合约
        console.log("\n📋 步骤 1: 连接合约");
        const RockPaperScissors = await ethers.getContractFactory("RockPaperScissorsFHE");
        const contract = RockPaperScissors.attach(contractAddress);
        console.log("✅ 合约连接成功");

        // 4. 读取游戏信息
        console.log("\n📋 步骤 2: 读取游戏信息");
        const game = await contract.games(gameId);
        
        console.log(`   玩家: ${game.player}`);
        console.log(`   下注金额: ${ethers.formatEther(game.betAmount)} ETH`);
        console.log(`   奖励金额: ${ethers.formatEther(game.reward)} ETH`);
        console.log(`   已结算: ${game.settled}`);
        console.log(`   已领奖: ${game.rewarded}`);

        // 5. 验证
        if (game.player !== player.address) {
            throw new Error("你不是这个游戏的玩家！");
        }

        if (!game.settled) {
            throw new Error("游戏尚未结算！请先运行解密脚本。");
        }

        if (game.rewarded) {
            throw new Error("奖励已经领取过了！");
        }

        if (game.reward === 0n) {
            throw new Error("没有可领取的奖励！");
        }

        // 6. 领取奖励
        console.log("\n📋 步骤 3: 领取奖励");
        console.log(`   奖励金额: ${ethers.formatEther(game.reward)} ETH`);
        console.log("   ⏳ 正在提交交易...");
        
        const tx = await contract.claimReward(gameId);
        console.log(`   交易哈希: ${tx.hash}`);
        console.log(`   查看交易: https://sepolia.etherscan.io/tx/${tx.hash}`);
        console.log("   ⏳ 等待确认...");
        
        const receipt = await tx.wait();
        console.log(`   ✅ 交易确认 (区块: ${receipt.blockNumber})`);
        console.log(`   Gas 使用: ${receipt.gasUsed.toString()}`);

        // 7. 检查新余额
        console.log("\n📋 步骤 4: 验证余额变化");
        const balanceAfter = await ethers.provider.getBalance(player.address);
        const balanceChange = balanceAfter - balanceBefore;
        
        console.log(`   领取前余额: ${ethers.formatEther(balanceBefore)} ETH`);
        console.log(`   领取后余额: ${ethers.formatEther(balanceAfter)} ETH`);
        console.log(`   实际获得: ${ethers.formatEther(balanceChange)} ETH`);

        // 8. 验证游戏状态
        const gameAfter = await contract.games(gameId);
        if (gameAfter.rewarded) {
            console.log("   ✅ 领奖状态已更新");
        }

        console.log("\n" + "=".repeat(60));
        console.log("🎉 恭喜！奖励领取成功！");
        console.log("=".repeat(60));

    } catch (error) {
        console.error("\n❌ 错误:", error.message);
        if (error.data) {
            console.error("   详细信息:", error.data);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

