const mongoose = require('mongoose');
require('dotenv').config();

const TeamInvite = require('./models/TeamInvite');

async function checkInvites() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 获取所有邀请
    const invites = await TeamInvite.find({}).sort({ createdAt: -1 });

    console.log(`共有 ${invites.length} 个邀请\n`);

    invites.forEach((invite, i) => {
      console.log(`\n邀请 ${i + 1}:`);
      console.log(`  _id: ${invite._id}`);
      console.log(`  status: ${invite.status}`);
      console.log(`  team: ${invite.team}`);
      console.log(`  invitedUser: ${invite.invitedUser}`);
      console.log(`  invitedBy: ${invite.invitedBy}`);
      console.log(`  message: ${invite.message || '无'}`);
      console.log(`  createdAt: ${invite.createdAt}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkInvites();
