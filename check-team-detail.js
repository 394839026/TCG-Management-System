const mongoose = require('mongoose');
require('dotenv').config();

const Team = require('./models/Team');

async function checkTeamData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 获取所有战队
    const teams = await Team.find({});
    console.log(`共有 ${teams.length} 个战队\n`);

    teams.forEach((team, i) => {
      console.log(`\n战队 ${i + 1}: ${team.name}`);
      console.log(`  _id: ${team._id}`);
      console.log(`  owner: ${team.owner}`);
      console.log(`  members 原始数据: ${JSON.stringify(team.members, null, 2)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkTeamData();
