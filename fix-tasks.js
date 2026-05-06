const mongoose = require('mongoose');
const Task = require('./models/Task');
require('dotenv').config();

async function fixTasks() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tcg_db');
    console.log('数据库连接成功！');
    
    const tasks = await Task.find({});
    console.log(`找到 ${tasks.length} 个任务`);
    
    for (const task of tasks) {
      // 检查 rewards 字段
      if (!task.rewards) {
        task.rewards = {
          exp: 0,
          points: 0,
          coins: 0
        };
        console.log(`修复任务 ${task.name}: 添加 rewards 字段`);
        await task.save();
      } else {
        let changed = false;
        
        // 检查 exp 字段
        if (task.rewards.exp === undefined || task.rewards.exp === null) {
          task.rewards.exp = 0;
          changed = true;
        }
        
        // 检查 points 字段
        if (task.rewards.points === undefined || task.rewards.points === null) {
          task.rewards.points = 0;
          changed = true;
        }
        
        // 检查 coins 字段
        if (task.rewards.coins === undefined || task.rewards.coins === null) {
          task.rewards.coins = 0;
          changed = true;
        }
        
        if (changed) {
          console.log(`修复任务 ${task.name}: 添加缺失的奖励字段`);
          await task.save();
        }
      }
    }
    
    console.log('所有任务已修复！');
    await mongoose.disconnect();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

fixTasks();
