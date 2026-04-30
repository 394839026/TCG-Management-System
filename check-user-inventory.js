const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('./models/Inventory');
const UserInventory = require('./models/UserInventory');
const User = require('./models/User');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 获取测试用户
    const testUser = await User.findOne({ username: '娌夋槦涔嬮棿' });
    if (!testUser) {
      console.log('❌ 未找到测试用户');
      process.exit(1);
    }
    console.log(`测试用户: ${testUser.username} (${testUser._id})\n`);

    // 检查用户的库存
    const userInventory = await UserInventory.find({ userId: testUser._id });
    console.log(`用户的库存记录数: ${userInventory.length}\n`);

    // 找出数量 > 0 的物品
    const itemsWithQuantity = userInventory.filter(ui => ui.quantity > 0);
    console.log(`数量 > 0 的物品数: ${itemsWithQuantity.length}\n`);

    // 获取这些物品的详细信息
    if (itemsWithQuantity.length > 0) {
      const itemIds = itemsWithQuantity.map(ui => ui.inventoryItemId);
      const inventoryItems = await Inventory.find({ _id: { $in: itemIds } });

      console.log('数量 > 0 的物品详情:');
      inventoryItems.forEach((item, index) => {
        const userItem = itemsWithQuantity.find(ui => ui.inventoryItemId.toString() === item._id.toString());
        console.log(`${index + 1}. ${item.name || item.itemName}`);
        console.log(`   gameType: ${item.gameType}`);
        console.log(`   userQuantity: ${userItem.quantity}`);
        console.log(`   itemId: ${item._id}`);
        console.log('');
      });

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

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkData();
