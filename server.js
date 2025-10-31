const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5173;

// 设置必需的 CORS 头，用于 FHE Web Workers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// 启用 CORS
app.use(cors());

// 提供静态文件
app.use(express.static(path.join(__dirname, 'frontend')));

// 所有路由都返回 index.html（用于 SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend server running at http://localhost:${PORT}`);
  console.log(`📋 Required CORS headers set for FHE support:`);
  console.log(`   - Cross-Origin-Opener-Policy: same-origin`);
  console.log(`   - Cross-Origin-Embedder-Policy: require-corp`);
});

