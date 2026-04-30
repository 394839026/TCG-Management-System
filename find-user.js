const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function findUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    const users = await User.find({});
    console.log(`共有 ${users.length} 个用户\n`);

    users.forEach((u, i) => {
      console.log(`用户 ${i + 1}:`);
      console.log(`  _id: ${u._id}`);
      console.log(`  username: ${u.username}`);
      console.log(`  email: ${u.email}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

findUsers();
