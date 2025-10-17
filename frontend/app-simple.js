/**
 * 简化版前端 - 通过后端 API 处理 FHE 加密/解密
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

// 后端 API 地址配置
// 生产环境：使用服务器 IP 和端口
// 本地开发：使用 localhost:3000
const BACKEND_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'http://154.12.85.16:3000';

// 全局状态
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let selectedChoice = null;

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

// 连接钱包
async function connectWallet() {
    const connectBtn = document.getElementById('connectBtn');
    
    // 防止二次点击
    if (connectBtn.disabled) return;
    
    try {
        showLoading('连接钱包中...', '请在 MetaMask 中确认');
        addLog('正在连接 MetaMask...', 'info');
        
        if (!window.ethereum) {
            hideLoading();
            addLog('❌ 未检测到 MetaMask', 'error');
            alert('请安装 MetaMask 钱包！');
            return;
        }

        // 请求连接钱包
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        userAddress = accounts[0];
        
        // 创建 provider 和 signer (使用 UMD 版本的 ethers)
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        // 连接合约
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // 获取余额
        const balance = await provider.getBalance(userAddress);
        const balanceInEth = ethers.formatEther(balance);
        
        // 获取入场费
        const entryFee = await contract.entryFee();
        document.getElementById('entryFee').textContent = `${ethers.formatEther(entryFee)} ETH`;
        
        // 更新 UI
        updateStatus('wallet', `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`, true);
        updateStatus('sdk', '就绪 ✅', true);
        
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
        addLog(`❌ 连接失败: ${error.message}`, 'error');
        alert(`连接失败: ${error.message}`);
        console.error(error);
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
        // 步骤 1: 加密
        showLoading('加密中...', '正在使用 FHE 加密您的选择');
        addLog('📋 步骤 1: 向后端请求加密数据...', 'info');
        
        // 调用后端 API 加密数据
        const encryptResponse = await fetch(`${BACKEND_API_URL}/api/encrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                choice: selectedChoice,
                contractAddress: CONTRACT_ADDRESS,
                userAddress: userAddress
            })
        });

        if (!encryptResponse.ok) {
            throw new Error('加密请求失败');
        }

        const { handle, inputProof } = await encryptResponse.json();
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

        // 步骤 4: 解密
        showLoading('解密中...', '正在解密游戏结果');
        addLog('📋 步骤 4: 向后端请求解密结果...', 'info');
        const decryptResponse = await fetch(`${BACKEND_API_URL}/api/decrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameId: gameId.toString(),
                contractAddress: CONTRACT_ADDRESS,
                userAddress: userAddress
            })
        });

        if (!decryptResponse.ok) {
            throw new Error('解密请求失败');
        }

        const decryptResult = await decryptResponse.json();
        addLog('✅ 解密成功', 'success');

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

        // 显示结果
        const game = await contract.games(gameId);
        hideLoading();
        displayResult(gameId, decryptResult, game);

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

// 将函数暴露到全局作用域，供 HTML onclick 调用
window.connectWallet = connectWallet;
window.selectChoice = selectChoice;
window.playGame = playGame;
window.closeResultModal = closeResultModal;

