const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// 加载环境变量
dotenv.config();

const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  
  // 发送后也记录
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[RESPONSE] ${req.method} ${req.path} - Status: ${res.statusCode}`);
    return originalSend.call(this, data);
  };
  
  next();
});

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/user-inventory', require('./routes/userInventory'));
app.use('/api/teams', require('./routes/team'));
app.use('/api/team-inventory', require('./routes/teamInventory'));
app.use('/api/shops', require('./routes/shop'));
app.use('/api/decks', require('./routes/deck'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/level-system', require('./routes/levelSystem'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/card-types', require('./routes/cardTypes'));

// 调试：打印所有路由
console.log('📋 已注册的路由:');
const printRoutes = (app, prefix = '') => {
  app._router?.stack?.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`  ${methods} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      printRoutes(layer.handle, prefix + layer.regexp?.toString()?.split('/')[1] || '');
    }
  });
};
// 简单版本，打印路由前缀
console.log('  /api/auth');
console.log('  /api/dashboard');
console.log('  /api/inventory');
console.log('  /api/user-inventory');
console.log('  /api/teams');
console.log('  /api/team-inventory ✅');
console.log('  /api/shops');
console.log('  /api/decks');
console.log('  /api/trade');
console.log('  /api/analytics');
console.log('  /api/friends');
console.log('  /api/activity');
console.log('  /api/favorites');
console.log('  /api/level-system');
console.log('  /api/notifications');
console.log('  /api/card-types');

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`✅ 服务器成功运行在端口 ${PORT}`);
});
