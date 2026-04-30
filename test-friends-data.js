const mongoose = require('mongoose');
const User = require('./models/User');
const Friendship = require('./models/Friendship');
require('dotenv').config();

async function testFriendsData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功');

    // 查找或创建一些测试用户
    const users = await User.find().limit(5);
    console.log(`找到 ${users.length} 个用户`);

    if (users.length < 2) {
      console.log('用户太少，无法创建好友关系');
      process.exit(0);
    }

    console.log('用户列表:');
    users.forEach(u => console.log(`- ${u.username} (${u._id})`));

    // 删除所有现有的友谊关系
    await Friendship.deleteMany({});
    console.log('✅ 已清空现有友谊关系');

    // 创建一些测试好友关系
    const friendships = [
      { requester: users[0]._id, addressee: users[1]._id, status: 'accepted' },
      { requester: users[1]._id, addressee: users[0]._id, status: 'pending' },
      { requester: users[0]._id, addressee: users[2]._id, status: 'accepted' },
      { requester: users[2]._id, addressee: users[1]._id, status: 'pending' }
    ];

    await Friendship.insertMany(friendships);
    console.log('✅ 已创建测试友谊关系');

    // 验证数据
    const allFriendships = await Friendship.find()
      .populate('requester', 'username')
      .populate('addressee', 'username');

    console.log('\n所有友谊关系:');
    allFriendships.forEach(f => {
      console.log(`- ${f.requester.username} -> ${f.addressee.username} (${f.status})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testFriendsData();
