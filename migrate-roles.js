const mongoose = require('mongoose');
require('dotenv').config();

const Shop = require('./models/Shop');

async function migrateEmployeeRoles() {
  try {
    console.log('正在连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg_card_system');
    console.log('数据库连接成功');

    console.log('\n=== 开始迁移员工角色 ===\n');

    // 将 'manager' 改为 'operator'
    const managerResult = await Shop.updateMany(
      { 'employees.role': 'manager' },
      { $set: { 'employees.$.role': 'operator' } }
    );
    console.log(`已将 ${managerResult.modifiedCount} 个 manager 角色改为 operator`);

    // 将 'cashier' 改为 'staff'
    const cashierResult = await Shop.updateMany(
      { 'employees.role': 'cashier' },
      { $set: { 'employees.$.role': 'staff' } }
    );
    console.log(`已将 ${cashierResult.modifiedCount} 个 cashier 角色改为 staff`);

    // 验证结果
    console.log('\n=== 验证迁移结果 ===\n');
    const shops = await Shop.find({});
    for (const shop of shops) {
      const roles = shop.employees.map(e => `${e.user}: ${e.role}`).join(', ');
      console.log(`店铺 ${shop.name}: ${roles || '无员工'}`);
    }

    console.log('\n=== 迁移完成 ===\n');

    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrateEmployeeRoles();