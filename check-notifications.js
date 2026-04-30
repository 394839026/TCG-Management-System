const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
require('dotenv').config();

async function checkNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✓ 数据库连接成功\n');

    const totalNotifications = await Notification.countDocuments();
    console.log(`数据库中共有 ${totalNotifications} 条通知\n`);

    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(5);
    console.log('最近的通知：');
    
    for (const notif of notifications) {
      const user = await User.findById(notif.recipient);
      console.log(`- 发给: ${user?.username || notif.recipient}`);
      console.log(`  标题: ${notif.title}`);
      console.log(`  已读: ${notif.isRead ? '是' : '否'}`);
      console.log(`  时间: ${notif.createdAt}`);
      console.log();
    }

    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkNotifications();
