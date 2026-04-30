const mongoose = require('mongoose');
require('dotenv').config();

const Team = require('./models/Team');
const User = require('./models/User');

async function checkTeamData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 获取所有用户
    const users = await User.find({}).limit(5);
    console.log(`共有 ${users.length} 个用户\n`);

    // 显示前几个用户的 username
    users.forEach((u, i) => {
      console.log(`用户 ${i + 1}: ${u.username} (${u._id})`);
    });

    // 获取所有战队
    const teams = await Team.find({}).populate('owner', 'username');
    console.log(`\n共有 ${teams.length} 个战队\n`);

    teams.forEach((team, i) => {
      console.log(`\n战队 ${i + 1}: ${team.name}`);
      console.log(`  owner: ${team.owner?.username || team.owner}`);
      console.log(`  members 数量: ${team.members?.length || 0}`);
      if (team.members && team.members.length > 0) {
        team.members.forEach((m, j) => {
          const userId = typeof m.user === 'object' ? m.user.username : m.user;
          console.log(`    成员 ${j + 1}: ${userId}, role: ${m.role}`);
        });
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkTeamData();
