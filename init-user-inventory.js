const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const InventoryItem = require('./models/Inventory');
const User = require('./models/User');
const UserInventory = require('./models/UserInventory');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function initUserInventory() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tcg-inventory';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB at', mongoUri);

    console.log('Fetching all users...');
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    console.log('Fetching all inventory items...');
    const items = await InventoryItem.find({});
    console.log(`Found ${items.length} inventory items`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const user of users) {
      console.log(`Processing user: ${user.email} (${user.role})`);

      for (const item of items) {
        try {
          // 检查用户是否已经拥有这个物品
          const existing = await UserInventory.findOne({
            userId: user._id,
            inventoryItemId: item._id
          });

          if (existing) {
            totalSkipped++;
            continue;
          }

          // 创建用户拥有的物品记录
          await UserInventory.create({
            userId: user._id,
            inventoryItemId: item._id,
            quantity: 0,
            value: 0,
            isFavorite: false
          });

          totalCreated++;
        } catch (error) {
          console.error(`Error creating user inventory for item ${item.itemName}:`, error.message);
        }
      }
    }

    console.log(`\n初始化完成！`);
    console.log(`创建了 ${totalCreated} 条用户库存记录`);
    console.log(`跳过了 ${totalSkipped} 条已存在的记录`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
}

initUserInventory();