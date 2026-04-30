const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const User = require('./models/User');

const createSuperAdmin = async () => {
  await connectDB();

  const existingAdmin = await User.findOne({ role: 'superadmin' });
  if (existingAdmin) {
    console.log('超级管理员已存在:', existingAdmin.username, existingAdmin.email);
    console.log('如需重置密码，请手动修改数据库');
    await mongoose.disconnect();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  const superAdmin = await User.create({
    username: 'admin',
    email: 'admin@example.com',
    password: hashedPassword,
    role: 'superadmin'
  });

  console.log('超级管理员创建成功！');
  console.log('用户名:', superAdmin.username);
  console.log('邮箱:', superAdmin.email);
  console.log('密码: admin123');
  console.log('角色:', superAdmin.role);

  await mongoose.disconnect();
  console.log('数据库连接已关闭');
};

createSuperAdmin();
