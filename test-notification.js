const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('./models/Notification');
const User = require('./models/User');

async function testNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 创建一个测试通知
    const testUser = await User.findOne({});
    if (!testUser) {
      console.log('❌ 未找到测试用户');
      process.exit(1);
    }
    console.log(`测试用户: ${testUser.username} (${testUser._id})\n`);

    // 创建通知
    const notification = await Notification.create({
      recipient: testUser._id,
      type: 'team_invite',
      title: '战队邀请',
      content: '你收到了来自战队「测试战队」的邀请',
      relatedId: 'test-team-id',
      isRead: false,
    });

    console.log('✅ 测试通知创建成功!');
    console.log(`通知ID: ${notification._id}`);
    console.log(`类型: ${notification.type}`);
    console.log(`标题: ${notification.title}`);
    console.log(`内容: ${notification.content}`);

    // 获取该用户的所有通知
    const userNotifications = await Notification.find({ recipient: testUser._id }).sort({ createdAt: -1 });
    console.log(`\n该用户的通知总数: ${userNotifications.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testNotification();
