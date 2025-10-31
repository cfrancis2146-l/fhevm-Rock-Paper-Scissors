/**
 * 后端服务 - 处理 FHE 加密
 * 运行: node backend-server.js
 * 注意: 解密功能已移至前端 SDK，此服务仅提供加密功能
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('hardhat');
const { fhevm } = require('hardhat');
// 注意: 解密功能已移至前端，不再需要 Relayer SDK
// const { createInstance, SepoliaConfig } = require('@zama-fhe/relayer-sdk/node');
// const hre = require('hardhat');

// 设置网络为 sepolia
process.env.HARDHAT_NETWORK = 'sepolia';

const app = express();
const PORT = 3000;

// CORS 配置 - 允许 Vercel 和本地开发
const corsOptions = {
    origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'https://*.vercel.app',  // Vercel 部署域名
        /\.vercel\.app$/,        // 正则匹配所有 vercel.app 域名
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RPS Backend',
        timestamp: new Date().toISOString(),
        fhevmInitialized: fhevmInitialized
    });
});

// 合约 ABI（仅用于加密，不需要读取游戏信息）
// const CONTRACT_ABI = [
//     "function games(uint256) view returns (address player, uint256 betAmount, bytes32 encryptedPlayerChoice, bytes32 encryptedSystemChoice, bytes32 encryptedResult, bool settled, bool rewarded, uint256 reward)",
// ];

// 初始化 FHEVM (启动时执行一次)
let fhevmInitialized = false;

async function initFhevm() {
    if (!fhevmInitialized) {
        console.log('⏳ 初始化 FHEVM CLI API...');
        await fhevm.initializeCLIApi();
        console.log('✅ FHEVM CLI API 初始化成功');
        fhevmInitialized = true;
    }
}

// API: 加密玩家选择
app.post('/api/encrypt', async (req, res) => {
    try {
        const { choice, contractAddress, userAddress } = req.body;

        console.log(`\n📥 收到加密请求:`);
        console.log(`   玩家: ${userAddress}`);
        console.log(`   选择: ${choice}`);
        console.log(`   合约: ${contractAddress}`);

        // 确保 FHEVM 已初始化
        await initFhevm();

        // 创建加密输入
        console.log('⏳ 正在加密数据...');
        const input = fhevm.createEncryptedInput(contractAddress, userAddress);
        input.add8(choice);

        const encryptedInput = await input.encrypt();
        console.log('✅ 加密成功');
        
        // 将 Uint8Array 转换为十六进制字符串
        const handleHex = '0x' + Buffer.from(encryptedInput.handles[0]).toString('hex');
        const inputProofHex = '0x' + Buffer.from(encryptedInput.inputProof).toString('hex');
        
        console.log(`   Handle: ${handleHex}`);

        res.json({
            handle: handleHex,
            inputProof: inputProofHex
        });

    } catch (error) {
        console.error('❌ 加密失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: 解密游戏结果 - 已删除
// 解密功能已移至前端 SDK，用户可以直接在前端使用 Zama SDK 进行解密
// 这样可以更好地保护用户隐私，无需通过后端服务

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', fhevmInitialized });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 后端服务已启动: http://0.0.0.0:${PORT}`);
    console.log('='.repeat(60));
    
    // 预先初始化 FHEVM
    await initFhevm();
    
    console.log('\n✅ 服务就绪，等待请求...\n');
});

