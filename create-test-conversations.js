const mongoose = require('mongoose');
const TradeMessage = require('./models/TradeMessage');
const TradeListing = require('./models/TradeListing');
const User = require('./models/User');
require('dotenv').config();

async function createTestConversations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    const users = await User.find().limit(5);
    console.log(`找到 ${users.length} 个用户\n`);

    if (users.length < 2) {
      console.log('需要至少2个用户！');
      process.exit(1);
    }

    console.log('用户列表：');
    users.forEach((u, i) => console.log(`${i + 1}. ${u.username} (${u._id})`));

    // 删除所有现有消息
    await TradeMessage.deleteMany({});
    console.log('\n✅ 已清空现有消息\n');

    // 创建测试交易挂牌
    const listing = await TradeListing.create({
      seller: users[1]._id,
      type: 'trade',
      title: '稀有卡牌交换',
      description: '我有稀有卡牌，想要交换其他稀有卡牌',
      price: 100,
      status: 'active',
      items: [],
      views: 0
    });
    console.log(`✅ 已创建测试交易挂牌: ${listing.title} (${listing._id})\n`);

    // 创建测试消息 - 用户0和用户1之间的对话
    const testMessages = [
      {
        listing: listing._id,
        sender: users[0]._id,
        receiver: users[1]._id,
        content: '你好！最近有什么好卡推荐吗？',
        isRead: true,
      },
      {
        listing: listing._id,
        sender: users[1]._id,
        receiver: users[0]._id,
        content: '嗨！我刚收了一张稀有卡，很不错！',
        isRead: true,
      },
      {
        listing: listing._id,
        sender: users[0]._id,
        receiver: users[1]._id,
        content: '真的吗？什么卡？',
        isRead: false,
      },
      {
        listing: listing._id,
        sender: users[1]._id,
        receiver: users[0]._id,
        content: '是一张限定版的龙卡，你要看吗？',
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
    console.log(`\n现在用户 ${users[0].username} 应该能看到与 ${users[1].username} 的对话了！`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

createTestConversations();
