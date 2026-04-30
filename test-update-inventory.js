const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('./models/Inventory');
const UserInventory = require('./models/UserInventory');
const User = require('./models/User');

async function testUpdate() {
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

    // 随机找一个 rune 类型的物品
    const runeItem = await Inventory.findOne({ gameType: 'rune' });
    if (!runeItem) {
      console.log('❌ 未找到 rune 类型物品');
      process.exit(1);
    }
    console.log(`Rune 物品: ${runeItem.name || runeItem.itemName} (${runeItem._id})\n`);

    // 查找或创建该用户的 UserInventory 记录
    let userInventory = await UserInventory.findOne({
      userId: testUser._id,
      inventoryItemId: runeItem._id
    });

    if (!userInventory) {
      console.log('创建新的 UserInventory 记录...');
      userInventory = await UserInventory.create({
        userId: testUser._id,
        inventoryItemId: runeItem._id,
        quantity: 10,
        value: 100,
        isFavorite: false,
        notes: '测试数据'
      });
      console.log('✅ 创建成功!');
    } else {
      console.log(`当前数量: ${userInventory.quantity}`);
      userInventory.quantity = 10;
      userInventory.value = 100;
      await userInventory.save();
      console.log('✅ 更新成功! 新数量: 10');
    }

    // 验证更新
    const updated = await UserInventory.findOne({
      userId: testUser._id,
      inventoryItemId: runeItem._id
    });
    console.log(`\n验证 - 物品: ${runeItem.name || runeItem.itemName}, 数量: ${updated.quantity}, 价值: ${updated.value}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testUpdate();
