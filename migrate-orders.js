const mongoose = require('mongoose');
const dotenv = require('dotenv');
const TradeListing = require('./models/TradeListing');

dotenv.config();

function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-management');
    console.log('✅ 已连接数据库');

    const listings = await TradeListing.find({ orderNumber: { $exists: false } });
    console.log(`📋 找到 ${listings.length} 个需要迁移的订单`);

    for (const listing of listings) {
      listing.orderNumber = generateOrderNumber();
      await listing.save();
      console.log(`✅ 更新订单: ${listing._id} -> ${listing.orderNumber}`);
    }

    console.log('🎉 迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrate();
