const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  创建测试Excel文件');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 创建测试数据
const testData = [
  {
    '编号': '001',
    '名称': '青眼白龙',
    '编码': 'LOB-001',
    '稀有度': '极稀有',
    '类型': '卡牌',
    '数量': 3,
    '价格': 150.00,
    '状态': '近完美',
    '描述': '经典稀有卡'
  },
  {
    '编号': '002',
    '名称': '黑魔术师',
    '编码': 'LOB-002',
    '稀有度': '超稀有',
    '类型': '卡牌',
    '数量': 5,
    '价格': 80.00,
    '状态': '良好',
    '描述': ''
  },
  {
    '编号': '003',
    '名称': '真红眼黑龙',
    '编码': 'LOB-003',
    '稀有度': '稀有',
    '类型': '卡牌',
    '数量': 2,
    '价格': 60.00,
    '状态': '极佳',
    '描述': '强力怪兽卡'
  },
  {
    '编号': '004',
    '名称': '元素英雄 新宇侠',
    '编码': 'DP01-JP001',
    '稀有度': '非普通',
    '类型': '卡牌',
    '数量': 10,
    '价格': 25.00,
    '状态': '完美',
    '描述': ''
  },
  {
    '编号': '005',
    '名称': '补充包 传奇对决',
    '编码': 'LDK-SET',
    '稀有度': '其他',
    '类型': '补充包',
    '数量': 20,
    '价格': 35.00,
    '状态': '良好',
    '描述': '未开封'
  }
];

// 创建工作簿
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(testData);

// 设置列宽
ws['!cols'] = [
  { wch: 10 },  // 编号
  { wch: 20 },  // 名称
  { wch: 15 },  // 编码
  { wch: 10 },  // 稀有度
  { wch: 10 },  // 类型
  { wch: 10 },  // 数量
  { wch: 10 },  // 价格
  { wch: 10 },  // 状态
  { wch: 30 }   // 描述
];

xlsx.utils.book_append_sheet(wb, ws, '测试数据');

// 保存文件
const filePath = path.join(__dirname, 'test_inventory.xlsx');
xlsx.writeFile(wb, filePath);

console.log('✓ 测试Excel文件已创建');
console.log(`  文件路径: ${filePath}`);
console.log(`  数据行数: ${testData.length}\n`);

console.log('📋 测试数据预览:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
testData.forEach((item, index) => {
  console.log(`${index + 1}. ${item['名称']} - 数量: ${item['数量']}, 价格: ¥${item['价格']}`);
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 使用提示:');
console.log('1. 可以用Excel打开此文件查看格式');
console.log('2. 在浏览器中访问 http://localhost:3000');
console.log('3. 以管理员身份登录');
console.log('4. 进入库存管理页面');
console.log('5. 点击"Excel导入"按钮');
console.log('6. 选择此文件进行导入测试\n');
