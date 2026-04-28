const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// 加载环境变量
dotenv.config();

// 连接数据库
connectDB();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  if (req.path.includes('/inventory')) {
    console.log(`[DEBUG] ${req.method} ${req.path} - User:`, req.user?._id);
  }
  next();
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));

// 测试路由 - 在 inventory 之前
app.post('/api/inventory-test', (req, res) => {
  console.log('[TEST] POST /api/inventory-test called');
  res.json({ success: true, message: 'Test route works' });
});

app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/teams', require('./routes/team'));
app.use('/api/shops', require('./routes/shop'));
app.use('/api/decks', require('./routes/deck'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/analytics', require('./routes/analytics'));

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
