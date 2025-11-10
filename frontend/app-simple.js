/**
 * 前端版本 - 使用 SDK 直接处理 FHE 加密/解密
 */

// 游戏配置
const CHOICES = {
    0: { name: '石头', emoji: '👊' },
    1: { name: '剪刀', emoji: '✂️' },
    2: { name: '布', emoji: '🖐️' }
};

const RESULTS = {
    0: '待定 ⏳',
    1: '玩家获胜 🎉',
    2: '玩家失败 😢',
    3: '平局 🤝'
};

const CONTRACT_ADDRESS = "0xc8B7d98E9585fbe71871Fb14Fa4463395026BF3F";

// ==================== Infura 配置 ====================
// 请在此处填入您的 Infura API Key（必需，用于避免 CORS 错误）
// 获取地址: https://infura.io/
// 注册后创建新项目，选择 Ethereum -> Sepolia 网络，即可获取 API Key
const INFURA_API_KEY = '6ad9f54d400a49c296691195a0eae7aa'; // ⚠️ 请替换为您的 Infura API Key

// 构建完整的 Infura RPC URL
// 如果未配置 API Key，将使用备用公共 RPC（可能有限制或 CORS 问题）
const SEPOLIA_RPC_URL = INFURA_API_KEY && INFURA_API_KEY !== 'YOUR_INFURA_API_KEY_HERE' 
    ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
    : 'https://rpc.sepolia.org'; // 备用公共 RPC（如果 Infura 未配置）

// 网络配置 - Sepolia 测试网
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 的十六进制
const SEPOLIA_CONFIG = {
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia Test Network',
    nativeCurrency: {
        name: 'Sepolia ETH',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: [SEPOLIA_RPC_URL],
    blockExplorerUrls: ['https://sepolia.etherscan.io/']
};

// 注意：加密操作已移至前端 SDK，不再需要后端 API

// 全局状态
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let selectedChoice = null;
let fheInstance = null; // FHE SDK 实例
let sdkReady = false; // SDK 是否已初始化

// 合约 ABI (只需要用到的函数)
const CONTRACT_ABI = [
    "function entryFee() view returns (uint256)",
    "function playGame(bytes32 encryptedChoice, bytes calldata inputProof) payable returns (uint256)",
    "function games(uint256) view returns (address player, uint256 betAmount, bytes32 encryptedPlayerChoice, bytes32 encryptedSystemChoice, bytes32 encryptedResult, bool settled, bool rewarded, uint256 reward)",
    "function getPlayerGames(address player) view returns (uint256[])",
    "function settleGame(uint256 gameId, uint8 playerChoice, uint8 systemChoice, uint8 result)",
    "function claimReward(uint256 gameId)"
];

// 显示/隐藏加载状态
function showLoading(text, subtext = '') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingSubtext').textContent = subtext;
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// 日志函数 (保留控制台输出)
function addLog(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// 更新状态显示
function updateStatus(type, value, isConnected = false) {
    const element = document.getElementById(`${type}Status`);
    element.textContent = value;
    element.className = `status-value ${isConnected ? 'connected' : 'disconnected'}`;
}

// 初始化 Zama FHE SDK
async function initFHESDK() {
    if (sdkReady && fheInstance) {
        console.log('✅ SDK 已初始化');
        return fheInstance;
    }

    try {
        addLog('🔧 正在初始化 Zama FHE SDK...', 'info');
        showLoading('初始化加密服务...', '正在加载 Zama FHE SDK');
        
        // 等待 SDK 加载完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 查找 SDK 全局对象
        const win = window;
        let SDK = null;
        
        // 可能的全局变量名
        const possibleNames = [
            'RelayerSDK',
            'ZamaSDK',
            'FhevmSDK',
            'relayerSDK',
            'fhevm',
            'ZamaRelayerSDK',
        ];
        
        // 方法A: 按名称查找
        for (const name of possibleNames) {
            if (win[name] && typeof win[name] === 'object') {
                const obj = win[name];
                if (typeof obj.initSDK === 'function' && 
                    typeof obj.createInstance === 'function' &&
                    obj.SepoliaConfig) {
                    console.log(`✅ 找到 SDK at window.${name}`);
                    SDK = obj;
                    break;
                }
            }
        }
        
        // 方法B: 智能搜索
        if (!SDK) {
            console.warn('⚠️ 预定义名称未找到，启动智能搜索...');
            for (const key of Object.keys(win)) {
                const obj = win[key];
                if (obj && 
                    typeof obj === 'object' && 
                    typeof obj.initSDK === 'function' &&
                    typeof obj.createInstance === 'function' &&
                    obj.SepoliaConfig) {
                    console.log(`✅ 智能找到 SDK at window.${key}`);
                    SDK = obj;
                    break;
                }
            }
        }
        
        if (!SDK) {
            throw new Error('未找到 Zama FHE SDK，请检查脚本是否已加载');
        }
        
        // 初始化 SDK
        addLog('📦 调用 initSDK()...', 'info');
        const { initSDK, createInstance, SepoliaConfig } = SDK;
        await initSDK();
        addLog('✅ initSDK() 完成', 'success');
        
        // 创建自定义配置，覆盖 RPC URL 为 Infura
        addLog('🔧 配置自定义 RPC 端点...', 'info');
        addLog(`📡 使用 RPC: ${SEPOLIA_RPC_URL}`, 'info');
        
        // 检查 SepoliaConfig 的结构
        console.log('📋 SepoliaConfig.network 原始值:', SepoliaConfig?.network);
        console.log('📋 SepoliaConfig.network 类型:', typeof SepoliaConfig?.network);
        
        // 创建自定义配置，直接覆盖 network 字段为 Infura URL
        // network 字段是一个字符串（RPC URL），不是对象
        const customConfig = {
            ...SepoliaConfig,
            network: SEPOLIA_RPC_URL  // 直接替换为 Infura URL
        };
        
        console.log('📋 自定义配置:', {
            originalNetwork: SepoliaConfig?.network,
            newNetwork: customConfig.network,
            usingRPC: SEPOLIA_RPC_URL
        });
        
        // 创建 FHE 实例（使用自定义配置）
        addLog('🔐 创建 FHE 实例...', 'info');
        fheInstance = await createInstance(customConfig);
        addLog('✅ FHE 实例创建完成', 'success');
        
        sdkReady = true;
        updateStatus('sdk', '就绪 ✅', true);
        hideLoading();
        
        return fheInstance;
        
    } catch (error) {
        console.error('❌ SDK 初始化失败:', error);
        addLog(`❌ SDK 初始化失败: ${error.message}`, 'error');
        hideLoading();
        throw error;
    }
}

// 切换到 Sepolia 网络
async function switchToSepolia(ethereum = window.ethereum) {
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
        return true;
    } catch (switchError) {
        // 如果网络不存在，则添加网络
        if (switchError.code === 4902) {
            try {
                await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [SEPOLIA_CONFIG],
                });
                return true;
            } catch (addError) {
                console.error('添加 Sepolia 网络失败:', addError);
                return false;
            }
        }
        console.error('切换网络失败:', switchError);
        return false;
    }
}

// 连接钱包
async function connectWallet() {
    const connectBtn = document.getElementById('connectBtn');
    
    // 防止二次点击
    if (connectBtn.disabled) return;
    
    try {
        showLoading('连接钱包中...', '请在 MetaMask 中确认');
        addLog('正在连接 MetaMask...', 'info');
        
        // 检测多个钱包扩展
        const ethereumProviders = [];
        if (window.ethereum) {
            ethereumProviders.push(window.ethereum);
        }
        // 检测多个钱包（某些浏览器会注入多个 provider）
        if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
            ethereumProviders.push(...window.ethereum.providers);
        }
        
        if (ethereumProviders.length === 0) {
            hideLoading();
            addLog('❌ 未检测到 MetaMask', 'error');
            alert('请安装 MetaMask 钱包！\n\n安装地址: https://metamask.io/');
            return;
        }
        
        // 如果有多个钱包，优先选择 MetaMask
        let ethereum = window.ethereum;
        if (ethereumProviders.length > 1) {
            addLog(`⚠️ 检测到 ${ethereumProviders.length} 个钱包扩展`, 'info');
            // 尝试找到 MetaMask
            const metamask = ethereumProviders.find(
                provider => provider.isMetaMask && !provider.isBraveWallet
            );
            if (metamask) {
                ethereum = metamask;
                addLog('✅ 已选择 MetaMask 钱包', 'success');
            } else {
                // 使用第一个
                ethereum = ethereumProviders[0];
                addLog('⚠️ 使用第一个可用钱包', 'info');
            }
        }
        
        // 检查是否已连接
        let accounts = [];
        try {
            accounts = await ethereum.request({ 
                method: 'eth_accounts' 
            });
        } catch (err) {
            console.warn('获取已连接账户失败:', err);
        }
        
        // 如果没有已连接的账户，请求连接
        if (accounts.length === 0) {
            addLog('📝 请求连接钱包...', 'info');
            try {
                accounts = await ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
            } catch (err) {
                // 用户拒绝连接
                if (err.code === 4001) {
                    hideLoading();
                    addLog('❌ 用户拒绝了连接请求', 'error');
                    alert('您已取消连接钱包');
                    return;
                }
                // 其他错误
                throw err;
            }
        }
        
        if (!accounts || accounts.length === 0) {
            throw new Error('未获取到账户地址');
        }
        
        // 创建 provider 和 signer (使用 UMD 版本的 ethers)
        addLog('🔧 创建 Provider...', 'info');
        provider = new ethers.BrowserProvider(ethereum);
        signer = await provider.getSigner();
        
        // 获取地址并转换为校验和格式（EIP-55）
        const rawAddress = accounts[0];
        userAddress = ethers.getAddress(rawAddress); // 转换为校验和格式
        
        addLog(`✅ 钱包地址: ${userAddress}`, 'success');
        
        // 检查网络
        const network = await provider.getNetwork();
        const currentChainId = '0x' + network.chainId.toString(16);
        
        if (currentChainId !== SEPOLIA_CHAIN_ID) {
            addLog(`⚠️ 当前网络不是 Sepolia，正在切换...`, 'info');
            showLoading('切换网络...', '请在 MetaMask 中确认切换到 Sepolia 网络');
            
            const switched = await switchToSepolia(ethereum);
            if (!switched) {
                hideLoading();
                alert('请手动切换到 Sepolia 测试网络！');
                return;
            }
            
            // 重新获取 provider 和 signer
            provider = new ethers.BrowserProvider(ethereum);
            signer = await provider.getSigner();
            addLog('✅ 已切换到 Sepolia 网络', 'success');
        }
        
        // 连接合约
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // 初始化 FHE SDK
        await initFHESDK();
        
        // 获取余额
        const balance = await provider.getBalance(userAddress);
        const balanceInEth = ethers.formatEther(balance);
        
        // 获取入场费
        const entryFee = await contract.entryFee();
        document.getElementById('entryFee').textContent = `${ethers.formatEther(entryFee)} ETH`;
        
        // 更新 UI
        updateStatus('wallet', `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`, true);
        
        addLog(`✅ 钱包连接成功: ${userAddress}`, 'success');
        addLog(`💰 账户余额: ${balanceInEth} ETH`, 'info');
        addLog(`🎮 入场费: ${ethers.formatEther(entryFee)} ETH`, 'info');
        
        // 显示游戏区域
        document.getElementById('gameSection').classList.add('active');
        document.getElementById('connectBtn').textContent = '✅ 已连接';
        document.getElementById('connectBtn').disabled = true;
        
        // 隐藏"连接钱包 参与游戏"区域
        const ctaSection = document.querySelector('.main-cta-section');
        if (ctaSection) {
            ctaSection.classList.add('hidden');
        }
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        const errorMessage = error.message || '未知错误';
        addLog(`❌ 连接失败: ${errorMessage}`, 'error');
        
        // 更友好的错误提示
        let userMessage = '连接失败';
        if (error.code === 4001) {
            userMessage = '您已取消连接钱包';
        } else if (error.code === -32002) {
            userMessage = '连接请求已在进行中，请检查 MetaMask 弹窗';
        } else if (error.message?.includes('Unexpected error') || error.message?.includes('Oe')) {
            userMessage = 'MetaMask 连接出错，请尝试：\n1. 刷新页面\n2. 重启 MetaMask 扩展\n3. 检查是否有其他钱包扩展冲突\n4. 更新 MetaMask 到最新版本';
        } else {
            userMessage = `连接失败: ${errorMessage}`;
        }
        
        alert(userMessage);
        console.error('连接钱包详细错误:', error);
    }
}

// 选择出拳
function selectChoice(choice) {
    selectedChoice = choice;
    
    // 更新按钮状态
    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-choice="${choice}"]`).classList.add('selected');
    
    // 启用游戏按钮
    document.getElementById('playBtn').disabled = false;
    
    addLog(`🎯 选择了: ${CHOICES[choice].name} ${CHOICES[choice].emoji}`, 'info');
}

// 开始游戏
async function playGame() {
    if (selectedChoice === null) {
        alert('请先选择出拳！');
        return;
    }

    const playBtn = document.getElementById('playBtn');
    
    // 防止二次点击
    if (playBtn.disabled) return;
    
    playBtn.disabled = true;

    try {
        // 步骤 1: 使用前端 SDK 加密
        showLoading('加密中...', '正在使用 FHE SDK 加密您的选择');
        addLog('📋 步骤 1: 使用前端 SDK 加密数据...', 'info');
        
        // 确保 SDK 已初始化
        if (!fheInstance || !sdkReady) {
            await initFHESDK();
        }
        
        // 创建加密输入
        addLog('🔐 创建加密输入...', 'info');
        // 确保地址使用校验和格式
        const checksummedAddress = ethers.getAddress(userAddress);
        const checksummedContractAddressForEncrypt = ethers.getAddress(CONTRACT_ADDRESS);
        const buffer = fheInstance.createEncryptedInput(checksummedContractAddressForEncrypt, checksummedAddress);
        buffer.add8(selectedChoice);
        
        // 执行加密
        addLog('⏳ 正在加密...', 'info');
        const encrypted = await buffer.encrypt();
        
        // 获取加密结果（将 Uint8Array 转换为十六进制字符串）
        const handle = '0x' + Array.from(encrypted.handles[0])
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        const inputProof = '0x' + Array.from(encrypted.inputProof)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        addLog('✅ 数据加密成功', 'success');

        // 步骤 2: 提交交易
        showLoading('提交交易中...', '请在 MetaMask 中确认交易');
        const entryFee = await contract.entryFee();
        addLog(`📋 步骤 2: 提交游戏交易 (入场费: ${ethers.formatEther(entryFee)} ETH)`, 'info');

        // 调用合约
        const tx = await contract.playGame(handle, inputProof, { value: entryFee });
        
        showLoading('等待确认中...', `交易哈希: ${tx.hash.slice(0, 10)}...`);
        addLog(`⏳ 等待交易确认... (${tx.hash})`, 'info');

        const receipt = await tx.wait();
        addLog(`✅ 交易确认成功 (Gas: ${receipt.gasUsed.toString()})`, 'success');

        // 获取游戏 ID
        const playerGames = await contract.getPlayerGames(userAddress);
        const gameId = playerGames[playerGames.length - 1];
        addLog(`🎮 游戏 ID: ${gameId}`, 'success');

        // 步骤 3: 等待 VRF
        showLoading('等待随机数...', 'Chainlink VRF 正在生成随机数');
        addLog('📋 步骤 3: 等待 Chainlink VRF 生成随机数...', 'info');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待 5 秒

        // 步骤 4: 解密（使用前端 SDK）
        showLoading('解密中...', '正在使用 FHE SDK 解密游戏结果');
        addLog('📋 步骤 4: 使用前端 SDK 解密...', 'info');
        
        // 确保 SDK 已初始化
        if (!fheInstance || !sdkReady) {
            await initFHESDK();
        }
        
        // 读取游戏信息
        const game = await contract.games(gameId);
        addLog('✅ 游戏信息获取成功', 'success');
        
        // 生成密钥对
        addLog('🔑 生成解密密钥对...', 'info');
        const keypair = fheInstance.generateKeypair();
        
        // 确保地址使用校验和格式
        const checksummedContractAddress = ethers.getAddress(CONTRACT_ADDRESS);
        const checksummedUserAddress = ethers.getAddress(userAddress);
        
        // 准备句柄
        const handleContractPairs = [
            {
                handle: game.encryptedPlayerChoice.toString(),
                contractAddress: checksummedContractAddress,
            },
            {
                handle: game.encryptedSystemChoice.toString(),
                contractAddress: checksummedContractAddress,
            },
            {
                handle: game.encryptedResult.toString(),
                contractAddress: checksummedContractAddress,
            },
        ];
        
        // 创建 EIP-712 签名
        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '10';
        const contractAddresses = [checksummedContractAddress];
        
        addLog('✍️ 创建 EIP-712 签名...', 'info');
        const eip712 = fheInstance.createEIP712(
            keypair.publicKey,
            contractAddresses,
            startTimeStamp,
            durationDays,
        );
        
        // 请求用户签名
        addLog('⏳ 请求 MetaMask 签名...', 'info');
        const signature = await signer.signTypedData(
            eip712.domain,
            { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
            eip712.message,
        );
        addLog('✅ 签名成功', 'success');
        
        // 执行解密
        addLog('🔓 正在通过 Zama Gateway 解密...', 'info');
        const decryptResultMap = await fheInstance.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace('0x', ''),
            contractAddresses,
            checksummedUserAddress,
            startTimeStamp,
            durationDays,
        );
        
        // 解析结果
        const decryptResult = {
            playerChoice: Number(decryptResultMap[game.encryptedPlayerChoice.toString()]),
            systemChoice: Number(decryptResultMap[game.encryptedSystemChoice.toString()]),
            result: Number(decryptResultMap[game.encryptedResult.toString()])
        };
        
        addLog('✅ 解密成功', 'success');
        addLog(`   玩家选择: ${CHOICES[decryptResult.playerChoice].name}`, 'info');
        addLog(`   系统选择: ${CHOICES[decryptResult.systemChoice].name}`, 'info');
        addLog(`   游戏结果: ${RESULTS[decryptResult.result]}`, 'info');

        // 步骤 5: 结算
        showLoading('结算中...', '正在上链结算游戏结果');
        addLog('📋 步骤 5: 结算游戏...', 'info');
        const settleTx = await contract.settleGame(
            gameId,
            decryptResult.playerChoice,
            decryptResult.systemChoice,
            decryptResult.result
        );
        await settleTx.wait();
        addLog('✅ 游戏结算成功', 'success');

        // 显示结果（重新读取游戏信息以获取最新状态）
        const finalGame = await contract.games(gameId);
        hideLoading();
        displayResult(gameId, decryptResult, finalGame);

    } catch (error) {
        hideLoading();
        addLog(`❌ 游戏失败: ${error.message}`, 'error');
        alert(`游戏失败: ${error.message}`);
        console.error(error);
    } finally {
        playBtn.disabled = false;
    }
}

// 显示游戏结果（弹窗版本）
function displayResult(gameId, decryptResult, game) {
    console.log('🔍 displayResult 被调用', { gameId, decryptResult, game });
    
    // 更新弹窗内容
    const modal = document.getElementById('resultModal');
    console.log('🔍 找到弹窗元素:', modal);
    
    document.getElementById('modalGameId').textContent = gameId.toString();
    
    // 设置玩家选择
    document.getElementById('modalPlayerEmoji').textContent = CHOICES[decryptResult.playerChoice].emoji;
    document.getElementById('modalPlayerChoice').textContent = CHOICES[decryptResult.playerChoice].name;
    
    // 设置系统选择
    document.getElementById('modalSystemEmoji').textContent = CHOICES[decryptResult.systemChoice].emoji;
    document.getElementById('modalSystemChoice').textContent = CHOICES[decryptResult.systemChoice].name;
    
    // 设置结果样式
    const outcomeSection = document.getElementById('modalOutcomeSection');
    const outcomeIcon = document.getElementById('modalOutcomeIcon');
    const outcomeMessage = document.getElementById('modalOutcomeMessage');
    
    // 移除所有结果类
    outcomeSection.classList.remove('win', 'lose', 'draw');
    
    // 根据结果设置样式
    if (decryptResult.result === 1) { // 获胜
        outcomeSection.classList.add('win');
        outcomeIcon.textContent = '🎉';
        outcomeMessage.textContent = '恭喜你赢了！';
        addLog('🎊 恭喜获胜！', 'success');
    } else if (decryptResult.result === 2) { // 失败
        outcomeSection.classList.add('lose');
        outcomeIcon.textContent = '😢';
        outcomeMessage.textContent = '很遗憾，你输了';
        addLog('😢 很遗憾失败了', 'error');
    } else { // 平局
        outcomeSection.classList.add('draw');
        outcomeIcon.textContent = '🤝';
        outcomeMessage.textContent = '平局！';
        addLog('🤝 平局！', 'info');
    }
    
    // 隐藏奖励显示和领取按钮
    document.getElementById('modalRewardDisplay').style.display = 'none';
    document.getElementById('modalClaimBtn').style.display = 'none';
    
    // 显示弹窗
    console.log('🔍 准备显示弹窗...');
    modal.style.display = 'flex';
    console.log('🔍 弹窗样式已设置为 flex，当前 display:', modal.style.display);
}

// 监听账户变化
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            addLog('❌ 钱包已断开', 'error');
            location.reload();
        } else {
            addLog('🔄 账户已切换，请刷新页面', 'info');
            location.reload();
        }
    });
}

// 关闭结果弹窗
function closeResultModal() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 页面加载时检测钱包
function detectWalletOnLoad() {
    if (!window.ethereum) {
        addLog('⚠️ 未检测到钱包扩展', 'warning');
        return;
    }
    
    // 检测多个钱包
    const providers = [];
    if (window.ethereum) {
        providers.push(window.ethereum);
    }
    if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
        providers.push(...window.ethereum.providers);
    }
    
    if (providers.length > 1) {
        addLog(`⚠️ 检测到 ${providers.length} 个钱包扩展，建议只保留 MetaMask`, 'warning');
    } else {
        addLog('✅ 已检测到钱包扩展', 'success');
    }
}

// 将函数暴露到全局作用域，供 HTML onclick 调用
// 确保函数在定义后立即暴露
if (typeof window !== 'undefined') {
    window.connectWallet = connectWallet;
    window.selectChoice = selectChoice;
    window.playGame = playGame;
    window.closeResultModal = closeResultModal;
    
    // 页面加载完成后检测钱包
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', detectWalletOnLoad);
    } else {
        detectWalletOnLoad();
    }
}

