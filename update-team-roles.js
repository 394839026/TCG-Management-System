const mongoose = require('mongoose');
require('dotenv').config();

const Team = require('./models/Team');

async function updateTeamRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 更新所有 role 为 'leader' 的成员为 'owner'
    const result = await Team.updateMany(
      { 'members.role': 'leader' },
      { $set: { 'members.$.role': 'owner' } }
    );

    console.log(`✅ 更新完成！`);
    console.log(`匹配文档数: ${result.matchedCount}`);
    console.log(`修改文档数: ${result.modifiedCount}`);

    // 检查更新后的数据
    const teams = await Team.find({});
    console.log('\n更新后的战队数据:');
    teams.forEach((team, i) => {
      console.log(`\n战队 ${i + 1}: ${team.name}`);
      console.log(`  owner: ${team.owner}`);
      console.log(`  members:`);
      team.members.forEach((m, j) => {
        const userId = typeof m.user === 'object' ? m.user.toString() : m.user;
        console.log(`    ${j + 1}. user: ${userId}, role: ${m.role}`);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

updateTeamRoles();
