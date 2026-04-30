const mongoose = require('mongoose');
const TradeMessage = require('./models/TradeMessage');
const TradeListing = require('./models/TradeListing');
const User = require('./models/User');
require('dotenv').config();

async function createTestMessagesForTest002() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    const users = await User.find().limit(5);
    console.log(`找到 ${users.length} 个用户\n`);

    // 找到 test002 用户（应该是 users[3] 或 users[4]）
    const test002User = users.find(u => u.username === 'test002');
    
    if (!test002User) {
      console.log('❌ 未找到 test002 用户！');
      process.exit(1);
    }
    
    console.log(`测试用户: ${test002User.username} (${test002User._id})\n`);

    // 找到 394839026 用户（test002 的好友）
    const friendUser = users.find(u => u.username === '394839026');
    
    if (!friendUser) {
      console.log('❌ 未找到 394839026 用户！');
      process.exit(1);
    }
    
    console.log(`好友用户: ${friendUser.username} (${friendUser._id})\n`);

    // 删除 test002 相关的现有消息
    await TradeMessage.deleteMany({
      $or: [
        { sender: test002User._id },
        { receiver: test002User._id }
      ]
    });
    console.log('✅ 已清空 test002 相关的现有消息\n');

    // 创建测试交易挂牌
    const listing = await TradeListing.create({
      seller: friendUser._id,
      type: 'trade',
      title: '稀有卡牌交换',
      description: '我有稀有卡牌，想要交换其他稀有卡牌',
      price: 100,
      status: 'active',
      items: [],
      views: 0
    });
    console.log(`✅ 已创建测试交易挂牌: ${listing.title} (${listing._id})\n`);

    // 创建测试消息 - test002 和 394839026 之间的对话
    const testMessages = [
      {
        listing: listing._id,
        sender: test002User._id,
        receiver: friendUser._id,
        content: '你好！想和你交个朋友！',
        isRead: true,
      },
      {
        listing: listing._id,
        sender: friendUser._id,
        receiver: test002User._id,
        content: '你好！当然可以！',
        isRead: true,
      },
      {
        listing: listing._id,
        sender: test002User._id,
        receiver: friendUser._id,
        content: '太好了！你是怎么开始收集卡牌的？',
        isRead: false,
      },
      {
        listing: listing._id,
        sender: friendUser._id,
        receiver: test002User._id,
        content: '我是从朋友那里得到的万智牌开始入坑的！',
        isRead: false,
      },
    ];

    const result = await TradeMessage.insertMany(testMessages);
    console.log(`✅ 已创建 ${result.length} 条测试消息\n`);

    // 显示创建的消息
    for (const msg of result) {
      const sender = users.find(u => u._id.toString() === msg.sender.toString());
      const receiver = users.find(u => u._id.toString() === msg.receiver.toString());
      console.log(`- ${sender.username} -> ${receiver.username}: ${msg.content}`);
    }

    console.log('\n✅ 测试数据创建完成！');
    console.log(`\n现在用户 ${test002User.username} 应该能看到与 ${friendUser.username} 的对话了！`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

createTestMessagesForTest002();
