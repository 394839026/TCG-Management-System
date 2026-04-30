const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('./models/Inventory');
const UserInventory = require('./models/UserInventory');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 检查所有 Inventory 中 gameType 的分布
    const allInventory = await Inventory.find({});
    console.log(`总共有 ${allInventory.length} 个库存物品\n`);

    const gameTypeCount = {};
    allInventory.forEach(item => {
      const gameType = item.gameType || '未定义';
      gameTypeCount[gameType] = (gameTypeCount[gameType] || 0) + 1;
    });
    console.log('gameType 分布:');
    Object.entries(gameTypeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} 个`);
    });

    // 检查用户的库存
    const users = await require('./models/User').find().limit(2);
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n测试用户: ${testUser.username} (${testUser._id})\n`);

      const userInventory = await UserInventory.find({ userId: testUser._id });
      console.log(`该用户的库存记录数: ${userInventory.length}\n`);

      // 检查用户有库存的物品的 gameType
      const userInventoryItems = await Inventory.find({
        _id: { $in: userInventory.map(ui => ui.inventoryItemId) }
      });

      const userGameTypeCount = {};
      userInventoryItems.forEach(item => {
        const gameType = item.gameType || '未定义';
        userGameTypeCount[gameType] = (userGameTypeCount[gameType] || 0) + 1;
      });
      console.log('用户有库存的物品的 gameType 分布:');
      Object.entries(userGameTypeCount).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} 个`);
      });

      // 检查数量 > 0 的物品
      const userInventoryWithQuantity = userInventory.filter(ui => ui.quantity > 0);
      console.log(`\n用户有数量 > 0 的物品数: ${userInventoryWithQuantity.length}\n`);

      if (userInventoryWithQuantity.length > 0) {
        const itemsWithQuantity = await Inventory.find({
          _id: { $in: userInventoryWithQuantity.map(ui => ui.inventoryItemId) }
        });

        const quantityGameTypeCount = {};
        itemsWithQuantity.forEach(item => {
          const gameType = item.gameType || '未定义';
          quantityGameTypeCount[gameType] = (quantityGameTypeCount[gameType] || 0) + 1;
        });
        console.log('用户数量 > 0 的物品的 gameType 分布:');
        Object.entries(quantityGameTypeCount).forEach(([type, count]) => {
          console.log(`  ${type}: ${count} 个`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkData();
