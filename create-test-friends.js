const mongoose = require('mongoose');
const User = require('./models/User');
const Friendship = require('./models/Friendship');
require('dotenv').config();

async function createTestFriends() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功');

    // 获取所有用户
    const users = await User.find().limit(5);
    console.log(`找到 ${users.length} 个用户`);

    if (users.length < 2) {
      console.log('用户太少，无法创建测试数据！请先创建至少2个用户。');
      process.exit(1);
    }

    console.log('用户列表：');
    users.forEach(u => console.log(`- ${u.username} (${u._id})`));

    // 删除所有现有友谊
    await Friendship.deleteMany({});
    console.log('✅ 已清空现有友谊关系');

    // 创建测试友谊
    const friendships = [
      // 用户1和用户2是好友
      {
        requester: users[0]._id,
        addressee: users[1]._id,
        status: 'accepted'
      },
      // 用户3向用户1发送好友请求
      {
        requester: users.length > 2 ? users[2]._id : users[1]._id,
        addressee: users[0]._id,
        status: 'pending'
      }
    ];

    // 如果有更多用户，添加更多测试数据
    if (users.length > 3) {
      friendships.push({
        requester: users[0]._id,
        addressee: users[3]._id,
        status: 'accepted'
      });
    }

    if (users.length > 4) {
      friendships.push({
        requester: users[4]._id,
        addressee: users[0]._id,
        status: 'pending'
      });
    }

    await Friendship.insertMany(friendships);
    console.log(`✅ 已创建 ${friendships.length} 条测试友谊关系`);

    // 验证数据
    const allFriendships = await Friendship.find()
      .populate('requester', 'username')
      .populate('addressee', 'username');

    console.log('\n所有友谊关系：');
    allFriendships.forEach(f => {
      console.log(`- ${f.requester.username} -> ${f.addressee.username} (${f.status})`);
    });

    console.log('\n✅ 测试数据创建完成！');
    console.log('请刷新浏览器查看好友页面！');

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

createTestFriends();
