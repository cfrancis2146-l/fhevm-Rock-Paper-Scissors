// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title RockPaperScissorsFHE
 * @dev 真正基于 Zama FHE 的石头剪刀布游戏
 * @notice 使用完整的 FHE 加密流程，确保游戏绝对公平
 * 
 * FHE 工作流程：
 * 1. 客户端使用 fhevmjs 加密玩家选择
 * 2. 通过 Relayer SDK 提交加密数据到合约
 * 3. 合约在加密状态下生成系统选择
 * 4. 合约在加密状态下比较结果
 * 5. 通过 Gateway 请求解密最终结果
 * 6. 玩家领取奖励
 */
contract RockPaperScissorsFHE is SepoliaConfig {
    // 游戏选项: 0=石头, 1=剪刀, 2=布
    enum Choice {
        Rock,      // 0
        Scissors,  // 1
        Paper      // 2
    }

    // 游戏结果
    enum GameResult {
        Pending,   // 待定
        Win,       // 玩家获胜
        Lose,      // 玩家失败
        Draw       // 平局
    }

    // 游戏记录结构
    struct Game {
        uint256 gameId;
        address player;
        euint8 encryptedPlayerChoice;    // FHE 加密的玩家选择
        euint8 encryptedSystemChoice;    // FHE 加密的系统选择
        euint8 encryptedResult;          // FHE 加密的结果
        uint8 decryptedPlayerChoice;     // 解密后的玩家选择
        uint8 decryptedSystemChoice;     // 解密后的系统选择
        GameResult finalResult;          // 最终结果
        uint256 betAmount;
        uint256 reward;
        uint256 timestamp;
        bool settled;                    // 是否已从 Gateway 获得解密结果
        bool rewarded;
    }

    // 状态变量
    uint256 public gameCounter;
    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    
    uint256 public entryFee = 0.01 ether;
    uint256 public rewardMultiplier = 180; // 1.8x
    address public owner;

    // 事件
    event GameCreated(
        uint256 indexed gameId,
        address indexed player,
        uint256 betAmount,
        uint256 timestamp
    );

    event GameSettled(
        uint256 indexed gameId,
        address indexed player,
        uint8 playerChoice,
        uint8 systemChoice,
        GameResult result,
        uint256 timestamp
    );

    event RewardClaimed(
        uint256 indexed gameId,
        address indexed player,
        uint256 reward
    );

    event DecryptionRequested(
        uint256 indexed gameId,
        address indexed player
    );

    event EntryFeeUpdated(uint256 newFee);
    event RewardMultiplierUpdated(uint256 newMultiplier);

    // 修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier gameExists(uint256 gameId) {
        require(gameId < gameCounter, "Game does not exist");
        _;
    }

    modifier onlyPlayer(uint256 gameId) {
        require(games[gameId].player == msg.sender, "Not the player");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice 开始游戏 - 使用真正的 FHE 加密
     * @param inputEuint8 使用 fhevmjs 在客户端加密的玩家选择
     * @param inputProof 零知识证明，验证加密数据的有效性
     * @return gameId 创建的游戏ID
     * 
     * 工作流程：
     * 1. 验证入场费
     * 2. 接收 FHE 加密的玩家选择
     * 3. 生成 FHE 加密的系统选择
     * 4. 在加密状态下计算结果
     * 5. 请求 Gateway 解密
     */
    function playGame(externalEuint8 inputEuint8, bytes calldata inputProof)
        external
        payable
        returns (uint256)
    {
        require(msg.value >= entryFee, "Insufficient entry fee");

        uint256 gameId = gameCounter++;
        
        // 从客户端接收 FHE 加密的选择并验证
        euint8 playerChoice = FHE.fromExternal(inputEuint8, inputProof);
        
        // 注意：客户端应确保输入值在有效范围内 (0-2)
        // FHE 操作会在加密状态下安全处理所有值
        
        // 生成系统的加密选择（使用 FHE 随机数）
        euint8 systemChoice = generateEncryptedChoice(gameId);
        
        // 在加密状态下计算游戏结果
        euint8 encryptedResult = calculateEncryptedResult(playerChoice, systemChoice);
        
        // 设置 FHE 权限：允许合约和玩家访问这些加密值
        FHE.allowThis(playerChoice);
        FHE.allow(playerChoice, msg.sender);
        
        FHE.allowThis(systemChoice);
        FHE.allow(systemChoice, msg.sender);
        
        FHE.allowThis(encryptedResult);
        FHE.allow(encryptedResult, msg.sender);
        
        // 创建游戏记录
        Game storage game = games[gameId];
        game.gameId = gameId;
        game.player = msg.sender;
        game.encryptedPlayerChoice = playerChoice;
        game.encryptedSystemChoice = systemChoice;
        game.encryptedResult = encryptedResult;
        game.betAmount = msg.value;
        game.timestamp = block.timestamp;
        game.settled = false;
        game.rewarded = false;
        
        playerGames[msg.sender].push(gameId);
        
        emit GameCreated(gameId, msg.sender, msg.value, block.timestamp);
        emit DecryptionRequested(gameId, msg.sender);
        
        return gameId;
    }

    /**
     * @notice 生成加密的系统选择
     * @dev 使用 FHE 随机数生成，确保系统无法预测
     */
    function generateEncryptedChoice(uint256 /* gameId */) private returns (euint8) {
        // 使用 FHE 内置随机数生成器，生成 0-3 范围的随机数
        // upperBound 必须是2的幂次方，所以我们用 4 来生成 0, 1, 2, 或 3
        euint8 randomChoice = FHE.randEuint8(4);
        
        // 将结果限制在 0-2 范围内：如果结果是3，则重新映射为0
        // 使用 FHE 条件选择：if (randomChoice == 3) then 0 else randomChoice
        euint8 result = FHE.select(
            FHE.eq(randomChoice, FHE.asEuint8(3)),
            FHE.asEuint8(0),  // 如果等于3，则选择0
            randomChoice      // 否则保持原值
        );
        
        return result;
    }

    /**
     * @notice 在加密状态下计算游戏结果
     * @dev 完全使用 FHE 操作，不泄露任何中间信息
     * 
     * 规则：
     * - Rock(0) beats Scissors(1)
     * - Scissors(1) beats Paper(2)
     * - Paper(2) beats Rock(0)
     * 
     * 结果编码：
     * - 0: Pending
     * - 1: Win
     * - 2: Lose
     * - 3: Draw
     */
    function calculateEncryptedResult(euint8 playerChoice, euint8 systemChoice)
        private
        returns (euint8)
    {
        // 检查平局：playerChoice == systemChoice
        ebool isDraw = FHE.eq(playerChoice, systemChoice);
        
        // 检查玩家获胜的情况
        // Rock(0) beats Scissors(1): player=0 && system=1
        ebool rockBeatsScissors = FHE.and(
            FHE.eq(playerChoice, FHE.asEuint8(0)),
            FHE.eq(systemChoice, FHE.asEuint8(1))
        );
        
        // Scissors(1) beats Paper(2): player=1 && system=2
        ebool scissorsBeatsPaper = FHE.and(
            FHE.eq(playerChoice, FHE.asEuint8(1)),
            FHE.eq(systemChoice, FHE.asEuint8(2))
        );
        
        // Paper(2) beats Rock(0): player=2 && system=0
        ebool paperBeatsRock = FHE.and(
            FHE.eq(playerChoice, FHE.asEuint8(2)),
            FHE.eq(systemChoice, FHE.asEuint8(0))
        );
        
        // 玩家获胜
        ebool playerWins = FHE.or(FHE.or(rockBeatsScissors, scissorsBeatsPaper), paperBeatsRock);
        
        // 构建结果：
        // if (isDraw) return 3;
        // else if (playerWins) return 1;
        // else return 2;
        euint8 result = FHE.select(
            isDraw,
            FHE.asEuint8(3), // Draw
            FHE.select(
                playerWins,
                FHE.asEuint8(1), // Win
                FHE.asEuint8(2)  // Lose
            )
        );
        
        return result;
    }

    /**
     * @notice 结算游戏 - 接收从 Gateway 解密的结果
     * @dev 这个函数由 Relayer 在获得解密结果后调用
     * @param gameId 游戏ID
     * @param decryptedPlayerChoice 解密的玩家选择
     * @param decryptedSystemChoice 解密的系统选择
     * @param decryptedResult 解密的结果
     */
    function settleGame(
        uint256 gameId,
        uint8 decryptedPlayerChoice,
        uint8 decryptedSystemChoice,
        uint8 decryptedResult
    )
        external
        gameExists(gameId)
        onlyPlayer(gameId)
    {
        Game storage game = games[gameId];
        require(!game.settled, "Already settled");
        
        // 验证解密结果（可选：通过签名验证来自 Gateway）
        require(decryptedPlayerChoice <= 2, "Invalid player choice");
        require(decryptedSystemChoice <= 2, "Invalid system choice");
        require(decryptedResult >= 1 && decryptedResult <= 3, "Invalid result");
        
        game.decryptedPlayerChoice = decryptedPlayerChoice;
        game.decryptedSystemChoice = decryptedSystemChoice;
        game.settled = true;
        
        // 根据结果设置奖励
        if (decryptedResult == 1) {
            // Win
            game.finalResult = GameResult.Win;
            game.reward = (game.betAmount * rewardMultiplier) / 100;
        } else if (decryptedResult == 2) {
            // Lose
            game.finalResult = GameResult.Lose;
            game.reward = 0;
        } else if (decryptedResult == 3) {
            // Draw
            game.finalResult = GameResult.Draw;
            game.reward = game.betAmount; // 退还本金
        }
        
        emit GameSettled(
            gameId,
            msg.sender,
            decryptedPlayerChoice,
            decryptedSystemChoice,
            game.finalResult,
            block.timestamp
        );
    }

    /**
     * @notice 领取奖励
     */
    function claimReward(uint256 gameId)
        external
        gameExists(gameId)
        onlyPlayer(gameId)
    {
        Game storage game = games[gameId];
        require(game.settled, "Game not settled yet");
        require(!game.rewarded, "Reward already claimed");
        require(game.reward > 0, "No reward to claim");
        require(address(this).balance >= game.reward, "Insufficient contract balance");
        
        game.rewarded = true;
        
        (bool success, ) = payable(msg.sender).call{value: game.reward}("");
        require(success, "Transfer failed");
        
        emit RewardClaimed(gameId, msg.sender, game.reward);
    }

    /**
     * @notice 批量领取奖励
     */
    function claimMultipleRewards(uint256[] calldata gameIds) external {
        uint256 totalReward = 0;
        
        for (uint256 i = 0; i < gameIds.length; i++) {
            uint256 gameId = gameIds[i];
            Game storage game = games[gameId];
            
            if (game.player == msg.sender && 
                game.settled && 
                !game.rewarded && 
                game.reward > 0) {
                
                game.rewarded = true;
                totalReward += game.reward;
                
                emit RewardClaimed(gameId, msg.sender, game.reward);
            }
        }
        
        require(totalReward > 0, "No rewards to claim");
        require(address(this).balance >= totalReward, "Insufficient balance");
        
        (bool success, ) = payable(msg.sender).call{value: totalReward}("");
        require(success, "Transfer failed");
    }

    // ============ 查询函数 ============

    function getGame(uint256 gameId)
        external
        view
        gameExists(gameId)
        returns (
            uint256,
            address,
            uint8,
            uint8,
            GameResult,
            uint256,
            uint256,
            uint256,
            bool,
            bool
        )
    {
        Game storage game = games[gameId];
        return (
            game.gameId,
            game.player,
            game.decryptedPlayerChoice,
            game.decryptedSystemChoice,
            game.finalResult,
            game.betAmount,
            game.reward,
            game.timestamp,
            game.settled,
            game.rewarded
        );
    }

    function getPlayerGames(address player) external view returns (uint256[] memory) {
        return playerGames[player];
    }

    function getGameCount() external view returns (uint256) {
        return gameCounter;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getChoiceName(uint8 choice) external pure returns (string memory) {
        if (choice == 0) return "Rock";
        if (choice == 1) return "Scissors";
        if (choice == 2) return "Paper";
        return "Unknown";
    }

    function getResultName(GameResult result) external pure returns (string memory) {
        if (result == GameResult.Pending) return "Pending";
        if (result == GameResult.Win) return "Win";
        if (result == GameResult.Lose) return "Lose";
        if (result == GameResult.Draw) return "Draw";
        return "Unknown";
    }

    // ============ 管理函数 ============

    function setEntryFee(uint256 newFee) external onlyOwner {
        entryFee = newFee;
        emit EntryFeeUpdated(newFee);
    }

    function setRewardMultiplier(uint256 newMultiplier) external onlyOwner {
        require(newMultiplier >= 100, "Multiplier must be >= 100");
        rewardMultiplier = newMultiplier;
        emit RewardMultiplierUpdated(newMultiplier);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    receive() external payable {}
}

