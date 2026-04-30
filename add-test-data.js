const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('./models/Inventory');
const UserInventory = require('./models/UserInventory');

async function addTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system');
    console.log('✅ 数据库连接成功\n');

    // 获取所有用户
    const users = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
    console.log(`共有 ${users.length} 个用户`);

    if (users.length === 0) {
      console.log('❌ 没有找到用户');
      process.exit(1);
    }

    const testUser = users[0];
    console.log(`测试用户: ${testUser.username} (${testUser._id})\n`);

    // 获取一些 rune 类型的物品
    const runeItems = await Inventory.find({ gameType: 'rune' }).limit(10);
    console.log(`找到 ${runeItems.length} 个 rune 物品`);

    // 更新这些物品的用户库存数量
    for (let i = 0; i < runeItems.length; i++) {
      const item = runeItems[i];
      const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 随机数量
      const value = Math.floor(Math.random() * 100) + 10; // 10-110 随机价值

      // 查找或创建
      let userInventory = await UserInventory.findOne({
        userId: testUser._id,
        inventoryItemId: item._id
      });

      if (userInventory) {
        userInventory.quantity = quantity;
        userInventory.value = value;
        await userInventory.save();
        console.log(`更新 ${i + 1}. ${item.name || item.itemName}: 数量=${quantity}, 价值=${value}`);
      } else {
        await UserInventory.create({
          userId: testUser._id,
          inventoryItemId: item._id,
          quantity: quantity,
          value: value,
          isFavorite: false,
          notes: ''
        });
        console.log(`创建 ${i + 1}. ${item.name || item.itemName}: 数量=${quantity}, 价值=${value}`);
      }
    }

    console.log('\n✅ 测试数据添加完成!');

    // 验证
    const userInventory = await UserInventory.find({ userId: testUser._id, quantity: { $gt: 0 } });
    console.log(`\n验证: 用户 ${testUser.username} 有 ${userInventory.length} 个数量 > 0 的物品`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

addTestData();
