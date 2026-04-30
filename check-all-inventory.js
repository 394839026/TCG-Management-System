const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('./models/Inventory');
const UserInventory = require('./models/UserInventory');
const User = require('./models/User');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 获取所有用户
    const users = await User.find({});
    console.log(`共有 ${users.length} 个用户\n`);

    for (const user of users.slice(0, 3)) {
      console.log(`\n=== 用户: ${user.username} (${user._id}) ===`);

      // 检查用户的库存
      const userInventory = await UserInventory.find({ userId: user._id });
      console.log(`库存记录数: ${userInventory.length}`);

      // 找出数量 > 0 的物品
      const itemsWithQuantity = userInventory.filter(ui => ui.quantity > 0);
      console.log(`数量 > 0 的物品数: ${itemsWithQuantity.length}`);

      if (itemsWithQuantity.length > 0) {
        // 获取这些物品的详细信息
        const itemIds = itemsWithQuantity.map(ui => ui.inventoryItemId);
        const inventoryItems = await Inventory.find({ _id: { $in: itemIds } });

        // 统计数量 > 0 的物品的 gameType 分布
        const gameTypeCount = {};
        inventoryItems.forEach(item => {
          const gameType = item.gameType || '未定义';
          if (!gameTypeCount[gameType]) {
            gameTypeCount[gameType] = 0;
          }
          gameTypeCount[gameType]++;
        });

        console.log('gameType 分布:');
        Object.entries(gameTypeCount).forEach(([type, count]) => {
          console.log(`  ${type}: ${count} 个`);
        });
      }
    }

    // 检查所有数量 > 0 的 UserInventory
    const allUserInventory = await UserInventory.find({ quantity: { $gt: 0 } });
    console.log(`\n=== 数据库中数量 > 0 的总记录数: ${allUserInventory.length} ===`);

    if (allUserInventory.length > 0) {
      const itemIds = allUserInventory.map(ui => ui.inventoryItemId);
      const inventoryItems = await Inventory.find({ _id: { $in: itemIds } });

      const gameTypeCount = {};
      inventoryItems.forEach(item => {
        const gameType = item.gameType || '未定义';
        if (!gameTypeCount[gameType]) {
          gameTypeCount[gameType] = 0;
        }
        gameTypeCount[gameType]++;
      });

      console.log('\n所有数量 > 0 物品的 gameType 分布:');
      Object.entries(gameTypeCount).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} 个`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkData();
