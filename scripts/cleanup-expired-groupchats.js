const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { GroupChat } = require('../models/GroupChat');

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system';

async function cleanupExpiredGroupChats() {
  try {
    console.log('开始清理过期群聊...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    const now = new Date();
    
    // 查找并删除所有已过期的群聊
    const expiredGroupChats = await GroupChat.find({
      expiresAt: { $exists: true, $lte: now }
    });

    console.log(`找到 ${expiredGroupChats.length} 个已过期的群聊`);

    for (const groupChat of expiredGroupChats) {
      try {
        await GroupChat.findByIdAndDelete(groupChat._id);
        console.log(`已删除过期群聊: ${groupChat.name} (${groupChat._id})`);
      } catch (deleteError) {
        console.error(`删除群聊 ${groupChat._id} 失败:`, deleteError);
      }
    }

    console.log('过期群聊清理完成');
    process.exit(0);
  } catch (error) {
    console.error('清理过期群聊失败:', error);
    process.exit(1);
  }
}

// 立即执行一次
cleanupExpiredGroupChats();
