const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');
require('dotenv').config();

const sendNotification = async (recipient, type, title, content, data = {}) => {
  try {
    await Notification.create({
      recipient,
      type,
      title,
      content,
      data,
    });
    console.log(`✓ 已发送通知给 ${data.username || recipient}`);
  } catch (error) {
    console.error('发送通知错误:', error);
  }
};

async function sendWelcomeNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✓ 数据库连接成功\n');

    const users = await User.find();
    console.log(`找到 ${users.length} 个用户\n`);

    for (const user of users) {
      const existingNotification = await Notification.findOne({
        recipient: user._id,
        type: 'welcome',
      });

      if (!existingNotification) {
        await sendNotification(
          user._id,
          'welcome',
          '🎉 欢迎加入！',
          `亲爱的 ${user.username}，欢迎来到卡牌综合管理系统！开始探索你的卡牌收藏之旅吧！`,
          { username: user.username }
        );
      } else {
        console.log(`- 跳过 ${user.username}（已收到过欢迎通知）`);
      }
    }

    console.log('\n✓ 完成！');
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

sendWelcomeNotifications();
