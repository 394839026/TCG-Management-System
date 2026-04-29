const mongoose = require('mongoose');
require('dotenv').config();

async function clearIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg_card_management');
    console.log('✅ 数据库连接成功');

    const InventoryModel = require('./models/Inventory');

    console.log('\n📦 检查并清理库存集合索引...');
    const indexes = await InventoryModel.collection.getIndexes();
    console.log('当前索引:', Object.keys(indexes));

    // 删除可能导致问题的文本索引
    if (indexes['itemName_text']) {
      console.log('删除旧文本索引...');
      await InventoryModel.collection.dropIndex('itemName_text');
      console.log('✅ 索引删除成功');
    } else {
      console.log('✅ 没有问题的文本索引');
    }

    console.log('\n✨ 索引清理完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

clearIndexes();