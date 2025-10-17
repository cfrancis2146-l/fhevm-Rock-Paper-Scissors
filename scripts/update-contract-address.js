const fs = require('fs');
const path = require('path');

// 旧合约地址和新合约地址
const OLD_CONTRACT_ADDRESS = "0x013E4F0Cd28D3c729A7c6884Ed2c40b411B1dbf0";
const NEW_CONTRACT_ADDRESS = "0x788802111D8906fbc839A4B63d7a993997040A3e";

console.log("🔄 更新合约地址脚本");
console.log("===================================================");
console.log("🔴 旧合约地址:", OLD_CONTRACT_ADDRESS);
console.log("🆕 新合约地址:", NEW_CONTRACT_ADDRESS);

// 需要更新的文件列表
const filesToUpdate = [
  {
    path: "deployments/sepolia/RockPaperScissorsFHE.json",
    description: "部署配置文件"
  },
  {
    path: "frontend/js/contract-config.js",
    description: "前端合约配置"
  },
  {
    path: "scripts/play-game-sepolia.js",
    description: "游戏脚本"
  },
  {
    path: "scripts/claim-reward.js",
    description: "奖励领取脚本"
  },
  {
    path: "scripts/test-game-sepolia.js",
    description: "测试脚本"
  }
];

// 更新部署文件
function updateDeploymentFile() {
  const deploymentPath = "deployments/sepolia/RockPaperScissorsFHE.json";
  
  try {
    if (fs.existsSync(deploymentPath)) {
      console.log(`\n📝 更新部署文件: ${deploymentPath}`);
      
      // 读取文件内容
      const content = fs.readFileSync(deploymentPath, 'utf8');
      
      // 替换地址
      const updatedContent = content.replace(
        new RegExp(OLD_CONTRACT_ADDRESS, 'g'),
        NEW_CONTRACT_ADDRESS
      );
      
      // 写回文件
      fs.writeFileSync(deploymentPath, updatedContent, 'utf8');
      
      console.log("✅ 部署文件更新成功");
    } else {
      console.log("⚠️ 部署文件不存在，跳过");
    }
  } catch (error) {
    console.log("❌ 更新部署文件失败:", error.message);
  }
}

// 更新前端配置文件
function updateFrontendConfig() {
  const configPath = "frontend/js/contract-config.js";
  
  try {
    if (fs.existsSync(configPath)) {
      console.log(`\n📝 更新前端配置: ${configPath}`);
      
      let content = fs.readFileSync(configPath, 'utf8');
      
      // 更新合约地址
      content = content.replace(
        /address:\s*"0x[0-9a-fA-F]{40}"/,
        `address: "${NEW_CONTRACT_ADDRESS}"`
      );
      
      fs.writeFileSync(configPath, content, 'utf8');
      console.log("✅ 前端配置更新成功");
    } else {
      console.log("⚠️ 前端配置文件不存在，跳过");
    }
  } catch (error) {
    console.log("❌ 更新前端配置失败:", error.message);
  }
}

// 更新脚本文件
function updateScriptFiles() {
  const scriptFiles = [
    "scripts/play-game-sepolia.js",
    "scripts/claim-reward.js",
    "scripts/test-game-sepolia.js"
  ];
  
  scriptFiles.forEach(scriptPath => {
    try {
      if (fs.existsSync(scriptPath)) {
        console.log(`\n📝 更新脚本: ${scriptPath}`);
        
        let content = fs.readFileSync(scriptPath, 'utf8');
        
        // 替换合约地址
        const updatedContent = content.replace(
          new RegExp(OLD_CONTRACT_ADDRESS, 'g'),
          NEW_CONTRACT_ADDRESS
        );
        
        if (content !== updatedContent) {
          fs.writeFileSync(scriptPath, updatedContent, 'utf8');
          console.log("✅ 脚本更新成功");
        } else {
          console.log("ℹ️ 脚本中未找到旧合约地址");
        }
      } else {
        console.log(`⚠️ 脚本文件不存在: ${scriptPath}`);
      }
    } catch (error) {
      console.log(`❌ 更新脚本失败 ${scriptPath}:`, error.message);
    }
  });
}

// 创建新合约的部署文件
function createNewDeploymentFile() {
  const newDeploymentPath = "deployments/sepolia/RockPaperScissorsFHE_new.json";
  
  try {
    console.log(`\n📝 创建新合约部署文件: ${newDeploymentPath}`);
    
    // 读取原部署文件
    const originalPath = "deployments/sepolia/RockPaperScissorsFHE.json";
    if (fs.existsSync(originalPath)) {
      let content = fs.readFileSync(originalPath, 'utf8');
      
      // 替换地址
      content = content.replace(
        new RegExp(OLD_CONTRACT_ADDRESS, 'g'),
        NEW_CONTRACT_ADDRESS
      );
      
      // 写入新文件
      fs.writeFileSync(newDeploymentPath, content, 'utf8');
      console.log("✅ 新部署文件创建成功");
    }
  } catch (error) {
    console.log("❌ 创建新部署文件失败:", error.message);
  }
}

// 主函数
async function main() {
  console.log("\n🚀 开始更新合约地址...");
  
  // 更新部署文件
  updateDeploymentFile();
  
  // 更新前端配置
  updateFrontendConfig();
  
  // 更新脚本文件
  updateScriptFiles();
  
  // 创建新部署文件
  createNewDeploymentFile();
  
  console.log("\n🎉 合约地址更新完成！");
  console.log("\n📋 更新摘要:");
  console.log("✅ 部署配置文件已更新");
  console.log("✅ 前端配置已更新");
  console.log("✅ 脚本文件已更新");
  console.log("✅ 新部署文件已创建");
  
  console.log("\n🔗 新合约信息:");
  console.log("📍 地址:", NEW_CONTRACT_ADDRESS);
  console.log("🌐 区块浏览器:", `https://sepolia.etherscan.io/address/${NEW_CONTRACT_ADDRESS}`);
  
  console.log("\n💡 下一步操作:");
  console.log("1. 测试新合约功能");
  console.log("2. 更新前端界面");
  console.log("3. 清理旧合约相关文件");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });






