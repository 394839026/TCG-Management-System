const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tcg-management');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function generateUIDs() {
  try {
    await connectDB();
    
    const usersWithoutUID = await User.find({ uid: { $exists: false } });
    
    if (usersWithoutUID.length === 0) {
      console.log('所有用户都已有UID');
      process.exit(0);
    }
    
    console.log(`发现 ${usersWithoutUID.length} 个用户没有UID`);
    
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const lastUser = await User.findOne({ uid: { $exists: true } }, {}, { sort: { createdAt: -1 } });
    
    let sequence = 1;
    if (lastUser && lastUser.uid) {
      const lastUid = lastUser.uid;
      const lastSequence = parseInt(lastUid.slice(-4));
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    for (const user of usersWithoutUID) {
      user.uid = `TCG${currentYear}${String(sequence).padStart(4, '0')}`;
      await user.save();
      console.log(`为用户 ${user.username} (${user.email}) 分配UID: ${user.uid}`);
      sequence++;
    }
    
    console.log(`成功为 ${usersWithoutUID.length} 个用户分配UID`);
    process.exit(0);
    
  } catch (error) {
    console.error('生成UID时发生错误:', error);
    process.exit(1);
  }
}

generateUIDs();