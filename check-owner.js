const mongoose = require('mongoose');
require('dotenv').config();

const Team = require('./models/Team');

async function checkTeam() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    const teams = await Team.find({});
    console.log(`共有 ${teams.length} 个战队\n`);

    teams.forEach((team, i) => {
      console.log(`\n战队 ${i + 1}: ${team.name}`);
      console.log(`  _id: ${team._id}`);
      console.log(`  owner: ${team.owner}`);
      console.log(`  owner 类型: ${typeof team.owner}`);
      console.log(`  members 数量: ${team.members?.length || 0}`);

      if (team.members && team.members.length > 0) {
        team.members.forEach((m, j) => {
          console.log(`    成员 ${j + 1}:`);
          console.log(`      user: ${m.user}`);
          console.log(`      user 类型: ${typeof m.user}`);
          console.log(`      role: ${m.role}`);
        });
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkTeam();
