const mongoose = require('mongoose');
const TradeMessage = require('./models/TradeMessage');
const User = require('./models/User');
require('dotenv').config();

async function checkConversations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    const users = await User.find().limit(3);
    console.log(`找到 ${users.length} 个用户\n`);

    if (users.length < 2) {
      console.log('需要至少2个用户才能测试！');
      process.exit(1);
    }

    const testUser = users[0];
    console.log(`测试用户: ${testUser.username} (${testUser._id})\n`);

    // 获取该用户的所有消息
    const messages = await TradeMessage.find({
      $or: [
        { sender: testUser._id },
        { receiver: testUser._id }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`该用户有 ${messages.length} 条消息\n`);

    if (messages.length > 0) {
      console.log('最近的消息：');
      messages.slice(0, 5).forEach((msg, i) => {
        console.log(`\n${i + 1}. 从 ${msg.sender.username} 到 ${msg.receiver.username}`);
        console.log(`   内容: ${msg.content}`);
        console.log(`   时间: ${msg.createdAt}`);
        console.log(`   是否已读: ${msg.isRead}`);
      });

      // 按用户分组对话
      console.log('\n\n按用户分组的对话：');
      const conversationsMap = new Map();

      for (const msg of messages) {
        const otherUserId = msg.sender._id.toString() === testUser._id.toString()
          ? msg.receiver._id.toString()
          : msg.sender._id.toString();

        if (!conversationsMap.has(otherUserId)) {
          const otherUser = msg.sender._id.toString() === testUser._id.toString()
            ? msg.receiver
            : msg.sender;

          conversationsMap.set(otherUserId, {
            _id: otherUserId,
            participants: [
              { _id: testUser._id, username: testUser.username, avatar: testUser.avatar },
              { _id: otherUser._id, username: otherUser.username, avatar: otherUser.avatar }
            ],
            lastMessage: msg,
            unreadCount: 0
          });
        }

        const conv = conversationsMap.get(otherUserId);
        if (msg.receiver._id.toString() === testUser._id.toString() && !msg.isRead) {
          conv.unreadCount++;
        }
      }

      const conversations = Array.from(conversationsMap.values());
      console.log(`共有 ${conversations.length} 个对话\n`);

      conversations.forEach((conv, i) => {
        const other = conv.participants.find(p => p._id.toString() !== testUser._id.toString());
        console.log(`${i + 1}. 与 ${other.username} (${other._id})`);
        console.log(`   对话ID: ${conv._id}`);
        console.log(`   未读消息: ${conv.unreadCount}`);
        console.log(`   最后消息: ${conv.lastMessage.content}`);
      });
    } else {
      console.log('没有任何消息！');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkConversations();
