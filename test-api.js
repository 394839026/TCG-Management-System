const mongoose = require('mongoose');
require('./config/db');

const InventoryItem = require('./models/Inventory');

async function test() {
  try {
    console.log('=== 测试符文战场各版本卡牌数量 ===');
    
    const unlCount = await InventoryItem.countDocuments({ gameType: 'rune', 'runeCardInfo.version': 'UNL' });
    console.log('UNL（破限）版本卡牌数量:', unlCount);
    
    const ognCount = await InventoryItem.countDocuments({ gameType: 'rune', 'runeCardInfo.version': 'OGN' });
    console.log('OGN（起源）版本卡牌数量:', ognCount);
    
    const sfdCount = await InventoryItem.countDocuments({ gameType: 'rune', 'runeCardInfo.version': 'SFD' });
    console.log('SFD（铸魂试炼）版本卡牌数量:', sfdCount);
    
    const totalRune = await InventoryItem.countDocuments({ gameType: 'rune' });
    console.log('符文战场总卡牌数量:', totalRune);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

test();
