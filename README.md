# 🎮 石头剪刀布 - Zama FHE + Chainlink VRF

一个基于区块链的隐私保护石头剪刀布游戏，使用 Zama 全同态加密（FHE）保护玩家选择，使用 Chainlink VRF 生成真随机数。

## 🏗️ 架构设计

```
前端 (浏览器)                                       区块链
    │                                                  │
    ├─ 连接 MetaMask ────────────────────────────────>│
    │                                                  │
    ├─ 选择出拳                                       │
    │   ├─ 使用 Zama FHE SDK 直接加密                │
    │   └─ 获得加密数据                               │
    │                                                  │
    ├─ 提交交易（包含加密数据） ──────────────────────>│
    │                                                  │
    │<─ VRF 随机数 ───────────────────────────────────┤
    │                                                  │
    ├─ 前端 SDK 解密                                  │
    │   ├─ 读取加密数据 ─────────────────────────────>│
    │   ├─ 使用 Zama SDK 解密                        │
    │   └─ 获得明文结果                               │
    │                                                  │
    ├─ 提交结算交易 ────────────────────────────────>│
    │                                                  │
    │<─ 显示游戏结果 ────────────────────────────────┤
```

**注意**: 所有加密和解密操作都在前端浏览器中完成，无需后端服务器！这样可以更好地保护用户隐私，减少服务器依赖。

## ✨ 特性

- ✅ **隐私保护**: 使用 Zama FHE 加密玩家选择
- ✅ **真随机性**: 使用 Chainlink VRF 生成系统选择
- ✅ **去中心化**: 智能合约自动执行游戏逻辑
- ✅ **简单易用**: 友好的 Web 界面

## 📦 安装依赖

```bash
# 进入项目目录
cd abc

# 安装依赖（如果还没安装）
npm install

# 额外安装后端依赖
npm install express cors
```

## 🚀 快速开始

### 启动前端服务

```bash
npm run frontend
```

前端会在 `http://localhost:5173` 启动

### 打开浏览器

访问: `http://localhost:5173`

**注意**: 所有加密操作都在前端浏览器中完成，无需启动后端服务器！

> 💡 如果需要使用后端服务器（用于测试或其他目的），可以运行：
> ```bash
> npm run dev:with-backend
> ```

## 🎯 使用流程

1. **连接钱包**: 点击 "连接 MetaMask"
2. **选择出拳**: 选择石头、剪刀或布
3. **开始游戏**: 点击 "开始游戏" 并支付入场费
4. **等待结果**: 系统自动解密并显示结果
5. **查看奖励**: 如果获胜，可以领取奖励

## 📁 项目结构

```
abc/
├── contracts/              # 智能合约
│   └── RockPaperScissorsFHE.sol
├── frontend/              # 前端文件
│   ├── index.html        # 主页面
│   └── app-simple.js     # 前端逻辑
├── scripts/              # 部署和测试脚本
│   └── play-and-decrypt.js
├── backend-server.js     # 后端服务（仅处理加密，解密已移至前端 SDK）
├── hardhat.config.js     # Hardhat 配置
└── package.json          # 项目配置
```

## 🔧 技术栈

### 前端
- **HTML/CSS/JavaScript**: 用户界面
- **Ethers.js v6**: 与区块链交互
- **MetaMask**: 钱包连接

### 后端（可选）
- **Node.js + Express**: API 服务器（可选，仅用于测试）
- **Hardhat**: 以太坊开发环境
- **FHEVM**: FHE 加密（生产环境已移至前端 SDK）

### 区块链
- **Solidity**: 智能合约
- **Zama fhEVM**: 全同态加密
- **Chainlink VRF**: 可验证随机函数

## 📝 合约地址

- **Sepolia 测试网**: `0xc8B7d98E9585fbe71871Fb14Fa4463395026BF3F`

## 🔐 环境变量

确保 `.env` 文件包含：

```env
PRIVATE_KEY=你的私钥
SEPOLIA_RPC_URL=Sepolia RPC URL
ETHERSCAN_API_KEY=Etherscan API Key（可选）
```

## 🧪 测试

### 运行完整测试脚本（Node.js）

```bash
npx hardhat run scripts/play-and-decrypt.js --network sepolia
```

### 使用 Web 界面测试

1. 启动后端: `npm run backend`
2. 启动前端: `npm run frontend`
3. 访问: `http://localhost:5173`

## 📊 游戏规则

- **入场费**: 0.01 ETH
- **获胜**: 获得 2x 奖励 (0.02 ETH)
- **失败**: 失去入场费
- **平局**: 退还入场费

## ⚙️ API 接口（已废弃）

> ⚠️ **重要**: 加密和解密操作已完全移至前端 SDK，不再需要后端 API！

### ~~POST /api/encrypt~~ （已移除）

加密功能现在直接在前端使用 Zama FHE SDK 完成：

```javascript
// 前端代码示例
const buffer = fheInstance.createEncryptedInput(contractAddress, userAddress);
buffer.add8(choice);
const encrypted = await buffer.encrypt();
```

### ~~POST /api/decrypt~~ （已移除）

解密功能也在前端使用 Zama SDK 完成，详见 `frontend/app-simple.js`。

## 🐛 故障排除

### 后端无法启动
- 确保已运行 `npm install`
- 检查端口 3000 是否被占用

### 前端连接失败
- 确保 MetaMask 已安装
- 检查网络是否为 Sepolia
- 确保 Zama FHE SDK 已正确加载（检查浏览器控制台）

### 交易失败
- 检查账户余额是否足够
- 确保已授权 MetaMask 交易

## 🌐 服务器部署指南

### 1. 安装 Node.js 和 npm

在 Ubuntu/Debian 服务器上：

```bash
# 更新包管理器
sudo apt update

# 安装 Node.js 20.x（推荐）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

在 CentOS/RHEL 服务器上：

```bash
# 安装 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. 上传项目到服务器

```bash
# 方法1: 使用 git clone
cd /www
git clone <your-repo-url> abc
cd abc

# 方法2: 使用 scp 上传
# 在本地机器上运行：
scp -r abc/ user@server:/www/

# 方法3: 使用 rsync
rsync -avz --exclude 'node_modules' abc/ user@server:/www/abc/
```

### 3. 安装依赖

```bash
cd /www/abc
npm install
npm install express cors
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env

# 编辑 .env 文件
nano .env
```

添加以下内容：
```env
PRIVATE_KEY=你的私钥
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETHERSCAN_API_KEY=你的Etherscan API Key
```

### 5. 使用 PM2 管理进程（推荐）

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动后端服务
pm2 start backend-server.js --name "rps-backend"

# 查看日志
pm2 logs rps-backend

# 设置开机自启
pm2 startup
pm2 save

# 其他 PM2 命令
pm2 list              # 查看所有进程
pm2 restart rps-backend  # 重启服务
pm2 stop rps-backend     # 停止服务
pm2 delete rps-backend   # 删除服务
```

### 6. 配置 Nginx 反向代理

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/rps-game
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 前端静态文件
    location / {
        root /www/abc/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/rps-game /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 7. 配置防火墙

```bash
# Ubuntu (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # 如果需要直接访问后端
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 8. 配置 SSL（可选，推荐）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 9. 更新前端配置

编辑 `frontend/app-simple.js`，更新 API 地址：

```javascript
// 如果使用域名和 Nginx 代理
const API_BASE_URL = window.location.origin;

// 或者直接指定
const API_BASE_URL = 'https://your-domain.com';
```

### 10. 快速部署脚本

创建 `deploy.sh` 文件，方便后续更新：

```bash
#!/bin/bash
echo "🚀 开始部署..."

# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 重启 PM2 服务
pm2 restart rps-backend

# 重启 Nginx
sudo systemctl reload nginx

echo "✅ 部署完成！"
```

赋予执行权限：

```bash
chmod +x deploy.sh
```

### 11. 监控和日志

```bash
# 查看后端日志
pm2 logs rps-backend

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 查看系统资源
pm2 monit
```

### 12. 安全建议

1. **不要提交 .env 文件到 Git**
2. **定期更新依赖**: `npm audit fix`
3. **使用强密码和 SSH 密钥**
4. **配置 fail2ban 防止暴力破解**
5. **定期备份数据和配置**
6. **使用非 root 用户运行服务**

## 📚 相关文档

- [Zama fhEVM 文档](https://docs.zama.ai/fhevm)
- [Chainlink VRF 文档](https://docs.chain.link/vrf)
- [Hardhat 文档](https://hardhat.org/docs)
- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 文档](https://nginx.org/en/docs/)

## 📄 许可证

MIT

## 🙏 鸣谢

- Zama - 全同态加密技术
- Chainlink - VRF 随机数服务
- OpenZeppelin - 智能合约库
