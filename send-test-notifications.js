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
    return true;
  } catch (error) {
    console.error('发送通知错误:', error);
    return false;
  }
};

async function sendTestNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✓ 数据库连接成功\n');

    const users = await User.find();
    console.log(`找到 ${users.length} 个用户\n`);

    let successCount = 0;

    for (const user of users) {
      const success = await sendNotification(
        user._id,
        'system',
        '🚀 新功能上线啦！',
        `亲爱的 ${user.username}，消息中心功能已全面升级！现在你可以收到系统通知、好友消息、好友请求等。快来探索一下吧！`,
        { 
          username: user.username,
          feature: '通知中心'
        }
      );
      
      if (success) {
        successCount++;
        console.log(`✓ 已发送给 ${user.username}`);
      }
    }

    console.log(`\n✓ 完成！成功发送 ${successCount} 条通知`);
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

sendTestNotifications();
