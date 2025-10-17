const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 检查游戏状态");
    console.log("=".repeat(60));

    try {
        // 1. 获取玩家账户
        const [player] = await ethers.getSigners();
        console.log("📋 步骤 1: 获取玩家账户");
        console.log(`   玩家地址: ${player.address}`);
        
        const balance = await ethers.provider.getBalance(player.address);
        console.log(`   账户余额: ${ethers.formatEther(balance)} ETH`);

        // 2. 连接合约
        console.log("\n📋 步骤 2: 连接合约");
        const contractAddress = "0x788802111D8906fbc839A4B63d7a993997040A3e";
        const contract = await ethers.getContractAt("RockPaperScissorsFHE", contractAddress);
        console.log("✅ 合约连接成功");
        console.log(`   合约地址: ${contractAddress}`);

        // 3. 获取玩家最新游戏
        console.log("\n📋 步骤 3: 获取玩家游戏");
        const playerGames = await contract.getPlayerGames(player.address);
        console.log(`   玩家游戏数量: ${playerGames.length}`);
        
        if (playerGames.length === 0) {
            console.log("⚠️  玩家没有游戏记录");
            return;
        }

        // 获取最新游戏ID
        const latestGameId = playerGames[playerGames.length - 1];
        console.log(`   最新游戏ID: ${latestGameId}`);

        // 4. 获取游戏详情
        console.log("\n📋 步骤 4: 获取游戏详情");
        const gameDetails = await contract.getGame(latestGameId);
        console.log("✅ 游戏详情获取成功");
        console.log("   游戏详情:", gameDetails);

        // 解析游戏详情数组
        const game = {
            gameId: gameDetails[0],
            player: gameDetails[1],
            decryptedPlayerChoice: gameDetails[2],
            decryptedSystemChoice: gameDetails[3],
            finalResult: gameDetails[4],
            betAmount: gameDetails[5],
            reward: gameDetails[6],
            timestamp: gameDetails[7],
            settled: gameDetails[8],
            rewarded: gameDetails[9]
        };

        // 5. 显示游戏状态
        console.log("\n📋 步骤 5: 显示游戏状态");
        console.log(`   游戏ID: ${game.gameId}`);
        console.log(`   玩家地址: ${game.player}`);
        console.log(`   解密玩家选择: ${game.decryptedPlayerChoice}`);
        console.log(`   解密系统选择: ${game.decryptedSystemChoice}`);
        console.log(`   最终结果: ${game.finalResult}`);
        console.log(`   投注金额: ${ethers.formatEther(game.betAmount)} ETH`);
        console.log(`   奖励金额: ${ethers.formatEther(game.reward)} ETH`);
        console.log(`   时间戳: ${new Date(Number(game.timestamp) * 1000).toLocaleString()}`);
        console.log(`   游戏状态: ${game.settled ? '已结算' : '未结算'}`);
        console.log(`   奖励状态: ${game.rewarded ? '已发放' : '未发放'}`);

        // 6. 检查解密状态
        console.log("\n📋 步骤 6: 检查解密状态");
        if (game.decryptedPlayerChoice !== undefined && game.decryptedPlayerChoice !== 0) {
            console.log("✅ 玩家选择已解密");
            console.log(`   玩家选择: ${getChoiceName(game.decryptedPlayerChoice)}`);
        } else {
            console.log("⚠️  玩家选择未解密");
        }

        if (game.decryptedSystemChoice !== undefined && game.decryptedSystemChoice !== 0) {
            console.log("✅ 系统选择已解密");
            console.log(`   系统选择: ${getChoiceName(game.decryptedSystemChoice)}`);
        } else {
            console.log("⚠️  系统选择未解密");
        }

        // 7. 检查是否可以结算
        console.log("\n📋 步骤 7: 检查结算条件");
        if (!game.settled) {
            console.log("⏳ 游戏尚未结算");
            console.log("   需要等待解密结果...");
            
            // 检查是否有解密请求事件
            console.log("\n📋 步骤 8: 检查解密请求事件");
            const filter = contract.filters.DecryptionRequested(latestGameId, player.address);
            const events = await contract.queryFilter(filter);
            
            if (events.length > 0) {
                console.log("✅ 找到解密请求事件");
                console.log(`   事件时间: ${new Date(Number(events[0].args.timestamp) * 1000).toLocaleString()}`);
            } else {
                console.log("⚠️  未找到解密请求事件");
            }
        } else {
            console.log("✅ 游戏已结算");
            console.log(`   奖励金额: ${ethers.formatEther(game.reward)} ETH`);
            
            if (game.reward > 0 && !game.rewarded) {
                console.log("💰 可以领取奖励");
            } else if (game.rewarded) {
                console.log("✅ 奖励已领取");
            } else {
                console.log("😢 没有奖励可领取");
            }
        }

        console.log("\n🎉 游戏状态检查完成！");
        console.log("=".repeat(60));

    } catch (error) {
        console.error("\n❌ 错误:", error.message);
        console.error("详细错误:", error);
        process.exit(1);
    }
}

// 获取选择名称
function getChoiceName(choice) {
    const ChoiceNames = {
        0: "石头 🪨",
        1: "剪刀 ✂️", 
        2: "布 📄"
    };
    return ChoiceNames[choice] || "未知";
}

// 获取结果名称
function getResultName(result) {
    switch (result) {
        case 0: return "待定";
        case 1: return "玩家获胜 🎉";
        case 2: return "玩家失败 😢";
        case 3: return "平局 🤝";
        default: return "未知结果";
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
