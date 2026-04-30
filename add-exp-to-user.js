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

const addExpToUser = async (username, expAmount) => {
  try {
    console.log(`正在查找用户: ${username}`);
    
    const user = await User.findOne({ username });
    if (!user) {
      console.error(`未找到用户: ${username}`);
      mongoose.connection.close();
      process.exit(1);
    }
    
    console.log(`当前用户: ${user.username}, 等级: ${user.level}, 经验值: ${user.exp}`);
    console.log(`正在添加 ${expAmount} 经验值...`);
    
    const result = await user.addExp(expAmount);
    
    if (result.levelUp) {
      console.log(`🎉 恭喜升级！新等级: ${result.newLevel}`);
    }
    
    console.log(`✅ 成功添加经验值！`);
    console.log(`当前等级: ${result.newLevel}`);
    console.log(`当前经验值: ${result.exp}`);
    console.log(`积分: ${user.points}`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('添加经验值失败:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

// 给沉星之间添加50经验值
addExpToUser('沉星之间', 50);