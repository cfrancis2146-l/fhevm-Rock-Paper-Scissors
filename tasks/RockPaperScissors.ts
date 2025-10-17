import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:playGame", "Play a game of Rock Paper Scissors")
  .addParam("contract", "The RockPaperScissors contract address")
  .addParam("choice", "Your choice: 0=Rock, 1=Scissors, 2=Paper")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;
    const RockPaperScissors = await ethers.getContractAt("RockPaperScissors", taskArguments.contract);
    
    const signers = await ethers.getSigners();
    const alice = signers[0];
    
    console.log(`Playing game with choice: ${taskArguments.choice}`);
    
    // Encrypt the choice
    const encryptedChoice = await fhevm
      .createEncryptedInput(taskArguments.contract, alice.address)
      .add8(parseInt(taskArguments.choice))
      .encrypt();
    
    // Get entry fee
    const entryFee = await RockPaperScissors.entryFee();
    
    // Play game
    const tx = await RockPaperScissors.connect(alice).playGame(
      encryptedChoice.handles[0],
      encryptedChoice.inputProof,
      { value: entryFee }
    );
    
    const receipt = await tx.wait();
    console.log(`Game created! Transaction: ${receipt?.hash}`);
    
    // Get game ID from events
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = RockPaperScissors.interface.parseLog(log);
        return parsed?.name === "GameCreated";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = RockPaperScissors.interface.parseLog(event);
      console.log(`Game ID: ${parsed?.args.gameId}`);
    }
  });

task("task:getGame", "Get game details")
  .addParam("contract", "The RockPaperScissors contract address")
  .addParam("gameid", "The game ID")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;
    const RockPaperScissors = await ethers.getContractAt("RockPaperScissors", taskArguments.contract);
    
    const game = await RockPaperScissors.getGame(taskArguments.gameid);
    
    console.log("Game Details:");
    console.log(`  Game ID: ${game[0]}`);
    console.log(`  Player: ${game[1]}`);
    console.log(`  Player Choice: ${game[2]}`);
    console.log(`  System Choice: ${game[3]}`);
    console.log(`  Result: ${game[4]}`);
    console.log(`  Bet Amount: ${ethers.formatEther(game[5])} ETH`);
    console.log(`  Reward: ${ethers.formatEther(game[6])} ETH`);
    console.log(`  Settled: ${game[8]}`);
    console.log(`  Rewarded: ${game[9]}`);
  });

task("task:claimReward", "Claim reward for a game")
  .addParam("contract", "The RockPaperScissors contract address")
  .addParam("gameid", "The game ID")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;
    const RockPaperScissors = await ethers.getContractAt("RockPaperScissors", taskArguments.contract);
    
    const signers = await ethers.getSigners();
    const alice = signers[0];
    
    console.log(`Claiming reward for game ${taskArguments.gameid}...`);
    
    const tx = await RockPaperScissors.connect(alice).claimReward(taskArguments.gameid);
    const receipt = await tx.wait();
    
    console.log(`Reward claimed! Transaction: ${receipt?.hash}`);
  });

