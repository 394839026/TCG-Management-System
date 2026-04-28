const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// 加载环境变量
dotenv.config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB 已连接'))
  .catch(err => {
    console.error('MongoDB 连接错误:', err.message);
    process.exit(1);
  });

async function createSuperAdmin() {
  try {
    // 检查是否已存在超级管理员
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('超级管理员已存在:');
      console.log(`用户名: ${existingSuperAdmin.username}`);
      console.log(`邮箱: ${existingSuperAdmin.email}`);
      console.log('如需重新创建，请先删除现有的超级管理员。');
      mongoose.connection.close();
      return;
    }

    // 创建超级管理员
    const superAdmin = await User.create({
      username: 'admin',
      email: 'admin@tcg.com',
      password: 'admin123456',
      role: 'superadmin'
    });

    console.log('\n✓ 超级管理员创建成功！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`用户名: ${superAdmin.username}`);
    console.log(`邮箱: ${superAdmin.email}`);
    console.log(`密码: admin123456`);
    console.log(`角色: ${superAdmin.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n请立即登录并修改默认密码！');

    mongoose.connection.close();
  } catch (error) {
    console.error('创建超级管理员失败:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

createSuperAdmin();
