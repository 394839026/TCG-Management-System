const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

// 加载环境变量
dotenv.config();

// 预加载所有模型（防止 Schema hasn't been registered 错误）
require('./models/Inventory');
require('./models/ShopInventoryItem');
require('./models/Shop');
require('./models/Order');
require('./models/ShopConversation');
require('./models/GroupChat');
require('./models/UserStatsHistory');
require('./models/Announcement');
require('./models/Task');
require('./models/UserTask');
require('./models/PlatformStoreItem');
require('./models/PlatformStoreRedemption');
require('./models/GachaProbability');
require('./models/GachaSimulationRecord');
require('./models/UserCollectionProgress');
const { GroupChat: GroupChatModel } = require('./models/GroupChat');

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
app.use('/api/shops', require('./routes/shopInventory'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/shops/:shopId/orders', require('./routes/order'));
app.use('/api/decks', require('./routes/deck'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/level-system', require('./routes/levelSystem'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/card-types', require('./routes/cardTypes'));
app.use('/api/shop-messages', require('./routes/shopMessages'));
app.use('/api/group-chats', require('./routes/groupChats'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/platform-store', require('./routes/platformStore'));
app.use('/api/gacha', require('./routes/gacha'));
app.use('/api/gacha-probability', require('./routes/gachaProbability'));
app.use('/api/gacha-user', require('./routes/gachaUser'));

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
console.log('  /api/orders');
console.log('  /api/decks');
console.log('  /api/trade');
console.log('  /api/analytics');
console.log('  /api/friends');
console.log('  /api/activity');
console.log('  /api/favorites');
console.log('  /api/level-system');
console.log('  /api/notifications');
console.log('  /api/card-types');
console.log('  /api/shop-messages');
console.log('  /api/group-chats');
console.log('  /api/announcements');
console.log('  /api/tasks ✅');
console.log('  /api/platform-store ✅');
console.log('  /api/gacha ✅');
console.log('  /api/gacha-probability ✅');

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

app.listen(PORT, async () => {
  console.log(`✅ 服务器成功运行在端口 ${PORT}`);
  
  // 启动定时任务：每小时清理一次过期群聊
  startGroupChatCleanup();
  
  // 确保数据库索引存在（只在启动时执行一次）
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 正在确保数据库索引...');
    try {
      await ensureIndexes();
      console.log('✅ 数据库索引检查完成');
    } catch (error) {
      console.error('❌ 索引创建失败:', error);
    }
  }
});

// 确保所有关键索引存在
async function ensureIndexes() {
  // 平台商店相关索引
  await require('./models/PlatformStoreItem').createIndexes([
    { isActive: 1, validFrom: 1, validUntil: 1 },
    { sortOrder: 1, createdAt: -1 }
  ]);
  
  await require('./models/PlatformStoreRedemption').createIndexes([
    { userId: 1, storeItem: 1 },
    { createdAt: -1 }
  ]);
  
  // 抽卡相关索引
  await require('./models/GachaSimulationRecord').createIndexes([
    { userId: 1, createdAt: -1 },
    { configId: 1 }
  ]);
  
  await require('./models/GachaProbability').createIndexes([
    { isActive: 1 }
  ]);
  
  // 用户收集进度索引
  await require('./models/UserCollectionProgress').createIndexes([
    { userId: 1 },
    { userId: 1, 'gachaStats.totalDraws': -1 }
  ]);
  
  // 用户索引
  await require('./models/User').createIndexes([
    { role: 1 },
    { lastGiftDate: 1 }
  ]);
}

// 定期清理过期群聊的函数
async function cleanupExpiredGroupChats() {
  try {
    const now = new Date();
    console.log(`[定时任务] 开始清理过期群聊 (${now.toLocaleString()})`);
    
    // 查找并删除所有已过期的群聊
    const expiredGroupChats = await GroupChatModel.find({
      expiresAt: { $exists: true, $lte: now }
    });

    if (expiredGroupChats.length > 0) {
      console.log(`[定时任务] 找到 ${expiredGroupChats.length} 个已过期的群聊`);

      for (const groupChat of expiredGroupChats) {
        try {
          await GroupChatModel.findByIdAndDelete(groupChat._id);
          console.log(`[定时任务] 已删除过期群聊: ${groupChat.name} (${groupChat._id})`);
        } catch (deleteError) {
          console.error(`[定时任务] 删除群聊 ${groupChat._id} 失败:`, deleteError);
        }
      }
    } else {
      console.log(`[定时任务] 没有需要清理的过期群聊`);
    }

  } catch (error) {
    console.error('[定时任务] 清理过期群聊失败:', error);
  }
}

// 启动定时任务
function startGroupChatCleanup() {
  console.log('[定时任务] 启动过期群聊清理任务 (每小时执行一次)');
  
  // 立即执行一次
  cleanupExpiredGroupChats();
  
  // 设置定时器，每小时执行一次 (3600000 毫秒 = 1 小时)
  setInterval(cleanupExpiredGroupChats, 3600000);
}
