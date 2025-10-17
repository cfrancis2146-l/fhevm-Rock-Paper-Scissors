/**
 * 完整的石头剪刀布游戏流程（玩游戏 + 解密结果）
 * 
 * 使用方法:
 * npx hardhat run scripts/play-and-decrypt.js --network sepolia
 * 
 * 设置选择（可选，默认为石头）:
 * CHOICE=0 npx hardhat run scripts/play-and-decrypt.js --network sepolia
 * 
 * 选择值:
 * - 0: 石头 🪨
 * - 1: 剪刀 ✂️  
 * - 2: 布 📄
 * 
 * 示例:
 * CHOICE=1 npx hardhat run scripts/play-and-decrypt.js --network sepolia  # 出剪刀
 */

const hre = require("hardhat");
const { ethers, fhevm } = require("hardhat");
const { createInstance, SepoliaConfig } = require("@zama-fhe/relayer-sdk/node");

// 游戏选项
const Choice = {
    Rock: 0,
    Scissors: 1,
    Paper: 2
};

const ChoiceNames = {
    0: "石头 🪨",
    1: "剪刀 ✂️",
    2: "布 📄"
};

const ResultNames = {
    0: "待定 ⏳",
    1: "玩家获胜 🎉",
    2: "玩家失败 😢",
    3: "平局 🤝"
};

// 合约地址
const contractAddress = "0xc8B7d98E9585fbe71871Fb14Fa4463395026BF3F";

async function main() {
    try {
        console.log("\n" + "█".repeat(60));
        console.log("🎮 完整的石头剪刀布游戏流程");
        console.log("█".repeat(60));

        // ==================== 第一部分：玩游戏 ====================
        
        // 1. 获取签名者
        console.log("\n📋 步骤 1: 获取玩家账户");
        const [player] = await ethers.getSigners();
        console.log(`   玩家地址: ${player.address}`);

        // 检查余额
        const balance = await ethers.provider.getBalance(player.address);
        console.log(`   账户余额: ${ethers.formatEther(balance)} ETH`);

        if (balance < ethers.parseEther("0.01")) {
            console.log("⚠️  余额不足，请确保账户有足够的 ETH 支付 gas 费用");
        }

        // 2. 初始化 FHEVM CLI API（用于加密输入）
        console.log("\n📋 步骤 2: 初始化 FHEVM CLI API");
        console.log("⏳ 正在初始化 FHEVM...");
        
        await fhevm.initializeCLIApi();
        console.log("✅ FHEVM CLI API 初始化成功");

        // 3. 连接合约
        console.log("\n📋 步骤 3: 连接合约");
        const RockPaperScissors = await ethers.getContractFactory("RockPaperScissorsFHE");
        const contract = RockPaperScissors.attach(contractAddress);
        
        console.log("✅ 合约连接成功");
        console.log(`   合约地址: ${contractAddress}`);

        // 4. 选择玩家的选项
        const choiceArg = process.env.CHOICE || process.argv.find(arg => /^[0-2]$/.test(arg));
        const playerChoice = choiceArg ? parseInt(choiceArg) : Choice.Rock;
        if (playerChoice < 0 || playerChoice > 2) {
            throw new Error("无效的选择！请使用 0(石头), 1(剪刀), 2(布)");
        }
        
        console.log(`\n📋 步骤 4: 玩家选择 ${ChoiceNames[playerChoice]}`);

        // 5. 使用 FHEVM CLI API 加密玩家选择
        console.log("\n📋 步骤 5: 加密玩家选择");
        console.log("⏳ 正在创建加密输入...");
        
        const input = fhevm.createEncryptedInput(contractAddress, player.address);
        input.add8(playerChoice);
        
        console.log("⏳ 正在加密数据...");
        const encryptedInput = await input.encrypt();
        
        console.log("✅ 加密成功");
        console.log(`   Handle: ${encryptedInput.handles[0]}`);

        // 6. 获取入场费
        const entryFee = await contract.entryFee();
        console.log(`\n📋 步骤 6: 准备支付入场费`);
        console.log(`   入场费: ${ethers.formatEther(entryFee)} ETH`);

        // 7. 玩游戏
        console.log("\n📋 步骤 7: 提交游戏交易");
        console.log("⏳ 正在提交交易到合约...");
        
        const tx = await contract.connect(player).playGame(
            encryptedInput.handles[0],
            encryptedInput.inputProof,
            { value: entryFee }
        );
        
        console.log(`   交易哈希: ${tx.hash}`);
        console.log("⏳ 等待交易确认...");
        
        const receipt = await tx.wait();
        console.log("✅ 交易确认成功！");
        console.log(`   Gas 使用量: ${receipt.gasUsed.toString()}`);
        console.log(`   区块号: ${receipt.blockNumber}`);

        // 8. 获取游戏ID（从玩家的游戏列表中获取最新的）
        console.log("\n📋 步骤 8: 获取游戏 ID");
        
        const playerGames = await contract.getPlayerGames(player.address);
        const gameId = playerGames[playerGames.length - 1];
        console.log(`✅ 获取到游戏 ID: ${gameId}`);

        console.log("\n" + "=".repeat(60));
        console.log("✅ 游戏创建成功！");
        console.log("=".repeat(60));

        // ==================== 第二部分：解密结果 ====================

        console.log("\n" + "█".repeat(60));
        console.log("🔓 开始解密游戏结果");
        console.log("█".repeat(60));

        // 9. 初始化 Relayer SDK（用于解密）
        console.log("\n📋 步骤 9: 初始化 Relayer SDK");
        const instance = await createInstance({
            ...SepoliaConfig,
            network: hre.network.provider
        });
        console.log("✅ Relayer SDK 初始化成功");

        // 10. 读取最新游戏信息
        console.log("\n📋 步骤 10: 读取游戏信息");
        const game = await contract.games(gameId);
        
        console.log(`   玩家: ${game.player}`);
        console.log(`   下注金额: ${ethers.formatEther(game.betAmount)} ETH`);
        console.log(`   已结算: ${game.settled}`);
        console.log(`   已领奖: ${game.rewarded}`);

        // 11. 生成密钥对
        console.log("\n📋 步骤 11: 生成解密密钥对");
        const keypair = instance.generateKeypair();
        console.log("✅ 密钥对生成成功");

        // 12. 准备解密请求
        console.log("\n📋 步骤 12: 准备解密请求");
        
        // 获取加密的句柄
        const playerChoiceHandle = game.encryptedPlayerChoice;
        const systemChoiceHandle = game.encryptedSystemChoice;
        const resultHandle = game.encryptedResult;
        
        console.log(`   玩家选择句柄: ${playerChoiceHandle}`);
        console.log(`   系统选择句柄: ${systemChoiceHandle}`);
        console.log(`   结果句柄: ${resultHandle}`);

        // 准备句柄-合约对
        const handleContractPairs = [
            {
                handle: playerChoiceHandle.toString(),
                contractAddress: contractAddress,
            },
            {
                handle: systemChoiceHandle.toString(),
                contractAddress: contractAddress,
            },
            {
                handle: resultHandle.toString(),
                contractAddress: contractAddress,
            },
        ];

        // 13. 创建 EIP-712 签名
        console.log("\n📋 步骤 13: 创建 EIP-712 签名");
        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '10'; // 10 天有效期
        const contractAddresses = [contractAddress]; // ✅ 必须是数组

        const eip712 = instance.createEIP712(
            keypair.publicKey,
            contractAddresses, // ✅ 传入数组
            startTimeStamp,
            durationDays,
        );

        console.log("⏳ 请求签名...");
        const signature = await player.signTypedData(
            eip712.domain,
            {
                UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification, // ✅ 正确的类型
            },
            eip712.message,
        );
        console.log("✅ 签名成功");

        // 14. 执行用户解密
        console.log("\n📋 步骤 14: 执行用户解密");
        console.log("⏳ 正在通过 Zama Gateway 解密...");
        
        const decryptResult = await instance.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace('0x', ''),
            contractAddresses,
            player.address,
            startTimeStamp,
            durationDays,
        );

        console.log("✅ 所有数据解密完成");

        // 15. 解析解密结果
        const decryptedPlayerChoice = Number(decryptResult[playerChoiceHandle.toString()]);
        const decryptedSystemChoice = Number(decryptResult[systemChoiceHandle.toString()]);
        const decryptedResult = Number(decryptResult[resultHandle.toString()]);

        // 16. 提交解密结果到合约（结算游戏）
        console.log("\n📋 步骤 15: 提交解密结果并结算游戏");
        console.log(`   玩家选择: ${ChoiceNames[decryptedPlayerChoice]}`);
        console.log(`   系统选择: ${ChoiceNames[decryptedSystemChoice]}`);
        console.log(`   游戏结果: ${ResultNames[decryptedResult]}`);
        
        const settleTx = await contract.settleGame(
            gameId,
            decryptedPlayerChoice,
            decryptedSystemChoice,
            decryptedResult
        );
        console.log(`⏳ 等待结算交易确认... (${settleTx.hash})`);
        
        const settleReceipt = await settleTx.wait();
        console.log(`✅ 游戏结算成功！`);
        console.log(`   Gas 使用量: ${settleReceipt.gasUsed}`);

        // 17. 重新读取游戏信息获取奖励数据
        const settledGame = await contract.games(gameId);

        // 18. 显示最终结果
        console.log("\n" + "█".repeat(60));
        console.log("🎮 游戏最终结果");
        console.log("█".repeat(60));
        console.log(`游戏 ID: ${gameId}`);
        console.log(`玩家选择: ${ChoiceNames[decryptedPlayerChoice]}`);
        console.log(`系统选择: ${ChoiceNames[decryptedSystemChoice]}`);
        console.log(`游戏结果: ${ResultNames[decryptedResult]}`);
        console.log(`下注金额: ${ethers.formatEther(settledGame.betAmount)} ETH`);
        
        if (decryptedResult === 1) {
            console.log(`\n🎊 恭喜获胜！奖励: ${ethers.formatEther(settledGame.reward || 0n)} ETH`);
            if (!settledGame.rewarded) {
                console.log("\n💡 提示: 运行以下命令领取奖励:");
                console.log(`   GAME_ID=${gameId} npx hardhat run scripts/claim-reward.js --network sepolia`);
            }
        } else if (decryptedResult === 2) {
            console.log("\n😢 很遗憾，下次再来！");
        } else if (decryptedResult === 3) {
            console.log(`\n🤝 平局！退还本金: ${ethers.formatEther(settledGame.reward || 0n)} ETH`);
            if (!settledGame.rewarded && settledGame.reward > 0n) {
                console.log("\n💡 提示: 运行以下命令领取退款:");
                console.log(`   GAME_ID=${gameId} npx hardhat run scripts/claim-reward.js --network sepolia`);
            }
        }
        console.log("█".repeat(60));

        console.log("\n🎉 游戏流程完成！");

    } catch (error) {
        console.error("\n❌ 错误:", error.message);
        if (error.data) {
            console.error("   详细信息:", error.data);
        }
        if (error.stack) {
            console.error("\n堆栈跟踪:");
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 脚本执行失败:", error);
        process.exit(1);
    });

