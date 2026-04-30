const mongoose = require('mongoose');
require('./config/db');

const InventoryItem = require('./models/Inventory');

async function checkDatabase() {
  try {
    console.log('=== 检查数据库中的卡牌数据 ===\n');
    
    // 检查所有符文战场卡牌
    const allRune = await InventoryItem.find({ gameType: 'rune' });
    console.log('1. 符文战场总卡牌数量:', allRune.length);
    
    // 统计各版本数量
    const versionCount = {};
    allRune.forEach(item => {
      const version = item.runeCardInfo?.version || '未知';
      versionCount[version] = (versionCount[version] || 0) + 1;
    });
    
    console.log('\n2. 各版本卡牌数量:');
    Object.keys(versionCount).sort().forEach(version => {
      const name = {
        'OGN': '起源',
        'SFD': '铸魂试炼', 
        'UNL': '破限',
        'P': '预组',
        '未知': '未知'
      }[version] || version;
      console.log(`   ${version} (${name}): ${versionCount[version]} 张`);
    });
    
    // 显示前5张UNL版本卡牌
    const unlCards = allRune.filter(item => item.runeCardInfo?.version === 'UNL');
    console.log(`\n3. 破限版本前5张卡牌示例:`);
    unlCards.slice(0, 5).forEach((card, i) => {
      console.log(`   ${i+1}. ${card.itemName} (${card.rarity})`);
    });
    
    console.log('\n=== 检查完成 ===');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

checkDatabase();
