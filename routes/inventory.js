const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const xlsx = require('xlsx');
const InventoryItem = require('../models/Inventory');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件格式 (.xlsx, .xls)'));
    }
  }
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件格式 (jpg, png, gif, webp)'));
    }
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const { itemType, search, sort = 'createdAt', order = 'desc', page = 1, limit = 50, rarity, gameType, priceMin, priceMax, showZeroQuantity, version, cardProperty, allTemplates } = req.query;
    
    // 如果请求获取所有模板（allTemplates=true），则查找 isTemplate 为 true 的
    const query = {};
    
    if (allTemplates === 'true') {
      query.isTemplate = true;
    } else {
      query.userId = req.user._id;
    }

    if (itemType && itemType !== 'all') {
      // 支持多个类型用逗号分隔
      if (itemType.includes(',')) {
        query.itemType = { $in: itemType.split(',') };
      } else {
        query.itemType = itemType;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { itemName: searchRegex },
        { 'runeCardInfo.cardNumber': searchRegex }
      ];
    }

    // 稀有度筛选
    if (rarity && rarity !== 'all') {
      // 支持多个稀有度用逗号分隔
      if (rarity.includes(',')) {
        query.rarity = { $in: rarity.split(',') };
      } else {
        query.rarity = rarity;
      }
    }

    // 游戏类型筛选
    if (gameType && gameType !== 'all') {
      query.gameType = gameType;
    }

    // 版本筛选（符文战场特有）
    if (version && version !== 'all') {
      query['runeCardInfo.version'] = version;
    }

    // 卡牌属性筛选（符文战场特有）
    if (cardProperty && cardProperty !== 'all') {
      if (cardProperty.includes(',')) {
        query.cardProperty = { $in: cardProperty.split(',') };
      } else {
        query.cardProperty = cardProperty;
      }
    }

    // 价格范围筛选
    if (priceMin) {
      query.value = query.value || {};
      query.value.$gte = parseFloat(priceMin);
    }
    if (priceMax) {
      query.value = query.value || {};
      query.value.$lte = parseFloat(priceMax);
    }

    // 是否显示数量为0的物品
    if (showZeroQuantity === 'false') {
      query.quantity = { $gt: 0 };
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sort]: sortOrder };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await InventoryItem.find(query).sort(sortOptions).skip(skip).limit(parseInt(limit));
    const total = await InventoryItem.countDocuments(query);

    res.json({
      success: true,
      count: items.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: items
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await InventoryItem.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$value'] } }
        }
      }
    ]);

    const allItems = await InventoryItem.find({ userId: req.user._id });
    const totalItems = allItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = allItems.reduce((sum, item) => sum + (item.quantity * item.value), 0);

    const digimonCount = allItems.filter(item => item.gameType === 'digimon').length;
    const runeCount = allItems.filter(item => item.gameType === 'rune').length;
    const pokemonCount = allItems.filter(item => item.gameType === 'pokemon').length;
    const shadowverseEvolveCount = allItems.filter(item => item.gameType === 'shadowverse-evolve').length;

    res.json({
      success: true,
      data: {
        byType: stats,
        totalItems,
        totalQuantity: allItems.length,
        totalValue,
        digimonCount,
        runeCount,
        pokemonCount,
        shadowverseEvolveCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/template', (req, res) => {
  try {
    const wb = xlsx.utils.book_new();

    const runeTemplate = [
      {
        '名称': '示例卡牌',
        '稀有度': '普通',
        '类型': '卡牌',
        '卡牌编号': '001',
        '版本': 'OGN',
        '卡牌属性': '',
        '描述': ''
      }
    ];
    const runeWs = xlsx.utils.json_to_sheet(runeTemplate);
    runeWs['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }
    ];
    xlsx.utils.book_append_sheet(wb, runeWs, '符文战场');

    const digimonTemplate = [
      {
        '名称': '示例卡牌',
        '稀有度': 'common',
        '类型': '卡牌',
        '描述': ''
      }
    ];
    const digimonWs = xlsx.utils.json_to_sheet(digimonTemplate);
    digimonWs['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 30 }
    ];
    xlsx.utils.book_append_sheet(wb, digimonWs, '数码宝贝');

    const pokemonTemplate = [
      {
        '名称': '示例卡牌',
        '稀有度': 'common',
        '类型': '卡牌',
        '描述': ''
      }
    ];
    const pokemonWs = xlsx.utils.json_to_sheet(pokemonTemplate);
    pokemonWs['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 30 }
    ];
    xlsx.utils.book_append_sheet(wb, pokemonWs, '宝可梦');

    const shadowverseEvolveTemplate = [
      {
        '名称': '示例卡牌',
        '稀有度': 'common',
        '类型': '卡牌',
        '描述': ''
      }
    ];
    const shadowverseEvolveWs = xlsx.utils.json_to_sheet(shadowverseEvolveTemplate);
    shadowverseEvolveWs['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 30 }
    ];
    xlsx.utils.book_append_sheet(wb, shadowverseEvolveWs, '影之诗进化对决');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_template.xlsx');
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.delete('/clear-all',
  protect,
  authorize('superadmin'),
  async (req, res) => {
    try {
      const { allTemplates } = req.query;
      let query;
      
      if (allTemplates === 'true') {
        query = { isTemplate: true };
      } else {
        query = { userId: req.user._id };
      }
      
      const result = await InventoryItem.deleteMany(query);
      res.json({
        success: true,
        message: `已清空 ${result.deletedCount} 条数据`
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.get('/export',
  protect,
  authorize('superadmin'),
  async (req, res) => {
    try {
      const { allTemplates } = req.query;
      let query;
      
      if (allTemplates === 'true') {
        query = { isTemplate: true };
      } else {
        query = { userId: req.user._id };
      }
      
      const items = await InventoryItem.find(query);

      const rarityReverseMap = {
        'N': '普通',
        'N_FOIL': '普通（闪）',
        'U': '不凡',
        'U_FOIL': '不凡（闪）',
        'R': '稀有',
        'E': '史诗',
        'AA': '异画',
        'AA_SIGN': '异画（签字）',
        'AA_ULTIMATE': '异画（终极超编）',
        'common': 'common',
        'uncommon': 'uncommon',
        'rare': 'rare',
        'super_rare': 'super_rare',
        'ultra_rare': 'ultra_rare',
        'secret_rare': 'secret_rare'
      };

      const typeReverseMap = {
        'card': '卡牌',
        'booster': '补充包',
        'accessory': '周边'
      };

      const versionReverseMap = {
        'OGN': 'OGN',
        'SFD': 'SFD',
        'UNL': 'UNL',
        'P': 'P'
      };

      const runeItems = items.filter(i => i.gameType === 'rune');
      const digimonItems = items.filter(i => i.gameType === 'digimon');
      const pokemonItems = items.filter(i => i.gameType === 'pokemon');
      const shadowverseEvolveItems = items.filter(i => i.gameType === 'shadowverse-evolve');

      const runeData = runeItems.map(item => ({
        '名称': item.itemName,
        '稀有度': rarityReverseMap[item.rarity] || item.rarity,
        '类型': typeReverseMap[item.itemType] || item.itemType,
        '卡牌编号': item.runeCardInfo?.cardNumber || '',
        '版本': versionReverseMap[item.runeCardInfo?.version] || item.runeCardInfo?.version || 'OGN',
        '卡牌属性': item.cardProperty || '',
        '描述': item.description || ''
      }));

      const digimonData = digimonItems.map(item => ({
        '名称': item.itemName,
        '稀有度': rarityReverseMap[item.rarity] || item.rarity,
        '类型': typeReverseMap[item.itemType] || item.itemType,
        '描述': item.description || ''
      }));

      const pokemonData = pokemonItems.map(item => ({
        '名称': item.itemName,
        '稀有度': rarityReverseMap[item.rarity] || item.rarity,
        '类型': typeReverseMap[item.itemType] || item.itemType,
        '描述': item.description || ''
      }));

      const shadowverseEvolveData = shadowverseEvolveItems.map(item => ({
        '名称': item.itemName,
        '稀有度': rarityReverseMap[item.rarity] || item.rarity,
        '类型': typeReverseMap[item.itemType] || item.itemType,
        '描述': item.description || ''
      }));

      const wb = xlsx.utils.book_new();

      if (runeData.length > 0) {
        const runeWs = xlsx.utils.json_to_sheet(runeData);
        runeWs['!cols'] = [
          { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }
        ];
        xlsx.utils.book_append_sheet(wb, runeWs, '符文战场');
      }

      if (digimonData.length > 0) {
        const digimonWs = xlsx.utils.json_to_sheet(digimonData);
        digimonWs['!cols'] = [
          { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 30 }
        ];
        xlsx.utils.book_append_sheet(wb, digimonWs, '数码宝贝');
      }

      if (pokemonData.length > 0) {
        const pokemonWs = xlsx.utils.json_to_sheet(pokemonData);
        pokemonWs['!cols'] = [
          { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 30 }
        ];
        xlsx.utils.book_append_sheet(wb, pokemonWs, '宝可梦');
      }

      if (shadowverseEvolveData.length > 0) {
        const shadowverseEvolveWs = xlsx.utils.json_to_sheet(shadowverseEvolveData);
        shadowverseEvolveWs['!cols'] = [
          { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 30 }
        ];
        xlsx.utils.book_append_sheet(wb, shadowverseEvolveWs, '影之诗进化对决');
      }

      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.xlsx');
      res.send(buffer);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.post('/import',
  protect,
  authorize('admin', 'superadmin'),
  excelUpload.single('file'),
  async (req, res) => {
    console.log('[IMPORT] Starting import...');
    console.log('[IMPORT] User:', req.user?._id, 'Role:', req.user?.role);
    console.log('[IMPORT] Query params:', req.query);
    try {
      if (!req.file) {
        console.log('[IMPORT] No file uploaded');
        return res.status(400).json({ message: '请上传Excel文件' });
      }

      console.log('[IMPORT] File received:', req.file.originalname);
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      console.log('[IMPORT] Sheet names:', workbook.SheetNames);
      
      // 判断是否导入为全局模板
      const { isGlobalTemplate } = req.query;
      const isGlobal = isGlobalTemplate === 'true';

      const rarityMap = {
        '普通': 'N', 'N': 'N', 'normal': 'N', 'Normal': 'N',
        '普通（闪）': 'N_FOIL', 'N_FOIL': 'N_FOIL',
        '不凡': 'U', 'U': 'U', 'uncommon': 'U', 'Uncommon': 'U',
        '不凡（闪）': 'U_FOIL', 'U_FOIL': 'U_FOIL',
        '稀有': 'R', 'R': 'R', 'rare': 'R', 'Rare': 'R',
        '史诗': 'E', 'E': 'E',
        '异画': 'AA', 'AA': 'AA',
        '异画（签字）': 'AA_SIGN', 'AA_SIGN': 'AA_SIGN',
        '异画（终极超编）': 'AA_ULTIMATE', 'AA_ULTIMATE': 'AA_ULTIMATE',
        'common': 'common', 'Common': 'common',
        'uncommon': 'uncommon', 'Uncommon': 'uncommon',
        'rare': 'rare', 'Rare': 'rare',
        'super_rare': 'super_rare', 'Super Rare': 'super_rare', 'SR': 'super_rare', 'sr': 'super_rare',
        'ultra_rare': 'ultra_rare', 'Ultra Rare': 'ultra_rare', 'UR': 'ultra_rare', 'ur': 'ultra_rare',
        'secret_rare': 'secret_rare', 'Secret Rare': 'secret_rare', 'SSR': 'secret_rare', 'ssr': 'secret_rare',
        '超稀有': 'super_rare', '超稀有': 'super_rare', '极稀有': 'ultra_rare', '秘密稀有': 'secret_rare'
      };

      const typeMap = {
        '卡牌': 'card', 'card': 'card',
        '补充包': 'booster', 'booster': 'booster',
        '周边': 'accessory', 'accessory': 'accessory'
      };

      const versionMap = {
        'OGN': 'OGN', 'ogn': 'OGN',
        'SFD': 'SFD', 'sfd': 'SFD',
        'UNL': 'UNL', 'unl': 'UNL',
        'P': 'P', 'p': 'P'
      };

      const validCardProperties = ['传奇', '英雄', '专属', '单位', '装备', '法术', '战场', '指示物', '符文'];

      const sheetNameToGameTypeMap = {
        '符文战场': 'rune',
        'rune': 'rune',
        'RUNE': 'rune',
        'Sheet1': 'rune',
        '数码宝贝': 'digimon',
        'digimon': 'digimon',
        'DIGIMON': 'digimon',
        '宝可梦': 'pokemon',
        'pokemon': 'pokemon',
        'POKEMON': 'pokemon',
        '影之诗进化对决': 'shadowverse-evolve',
        'shadowverse': 'shadowverse-evolve',
        'shadowverse-evolve': 'shadowverse-evolve',
        'SHADOWVERSE': 'shadowverse-evolve',
        'SHADOWVERSE-EVOLVE': 'shadowverse-evolve'
      };

      const results = { created: 0, updated: 0, unchanged: 0, failed: 0, errors: [] };

      console.log('[IMPORT] Available sheets:', workbook.SheetNames);

      for (const sheetName of workbook.SheetNames) {
        let gameType = sheetNameToGameTypeMap[sheetName];

        if (!gameType) {
          const lowerSheetName = sheetName.toLowerCase();
          if (lowerSheetName.includes('符文') || lowerSheetName.includes('rune') || lowerSheetName.includes('sheet1')) {
            gameType = 'rune';
          } else if (lowerSheetName.includes('数码') || lowerSheetName.includes('digimon')) {
            gameType = 'digimon';
          } else if (lowerSheetName.includes('宝可') || lowerSheetName.includes('pokemon')) {
            gameType = 'pokemon';
          } else if (lowerSheetName.includes('影之诗') || lowerSheetName.includes('shadowverse')) {
            gameType = 'shadowverse-evolve';
          } else {
            gameType = 'rune';
          }
        }

        console.log('[IMPORT] Processing sheet:', sheetName, '-> gameType:', gameType);

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        console.log('[IMPORT] Rows in sheet:', jsonData.length);

        if (jsonData.length < 2) {
          continue;
        }

        // 从第2行开始处理（跳过表头）
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNum = i + 2;

          try {
            const itemName = row['名称'] || row['itemName'] || row['name'] || String(row[0] || '');
            if (!itemName || itemName === 'undefined' || itemName === 'null' || String(itemName).trim() === '') {
              continue;
            }

            const rarityValue = row['稀有度'] || row['rarity'] || row[1] || '';
            const typeValue = row['类型'] || row['itemType'] || row['type'] || row[2] || '';
            const cardNumValue = row['卡牌编号'] || row['cardNumber'] || row[3] || '';
            const versionValue = row['版本'] || row['version'] || row[4] || '';
            const cardPropertyValue = row['卡牌属性'] || row['cardProperty'] || row[5] || '';
            
            // 正确处理数量：允许0，只有在undefined/null时才用默认值1
            let quantityValue = 1;
            if (row['数量'] !== undefined && row['数量'] !== null) {
              quantityValue = row['数量'];
            } else if (row['quantity'] !== undefined && row['quantity'] !== null) {
              quantityValue = row['quantity'];
            } else if (row[6] !== undefined && row[6] !== null) {
              quantityValue = row[6];
            }
            
            const priceValue = row['价格'] || row['value'] || row[7] || 0;
            const descValue = row['描述'] || row['description'] || row[6] || row[8] || '';

            // 调试信息 - 只在有需要时打印
            const isDebug = false;
            if (isDebug && i <= 10) {
              console.log(`[IMPORT] 第${i}行数据:`, JSON.stringify(row));
              console.log(`[IMPORT]   稀有度原始值: [${rarityValue}]`);
            }

            // 更加灵活的稀有度匹配
            let mappedRarity = null;
            const rarityStr = String(rarityValue).trim();
            
            // 先尝试精确匹配
            if (rarityMap[rarityStr]) {
              mappedRarity = rarityMap[rarityStr];
            } else {
              // 尝试模糊匹配 - 先检查更具体的关键词
              const lowerRarity = rarityStr.toLowerCase();
              
              // 先检查最具体的组合
              if (lowerRarity.includes('异画') || lowerRarity.includes('aa')) {
                if (lowerRarity.includes('签') || lowerRarity.includes('sign')) {
                  mappedRarity = 'AA_SIGN';
                } else if (lowerRarity.includes('终极') || lowerRarity.includes('ultimate')) {
                  mappedRarity = 'AA_ULTIMATE';
                } else {
                  mappedRarity = 'AA';
                }
              } 
              // 检查闪卡
              else if (lowerRarity.includes('闪')) {
                if (lowerRarity.includes('普') || lowerRarity.includes('n')) {
                  mappedRarity = 'N_FOIL';
                } else if (lowerRarity.includes('不') || lowerRarity.includes('u')) {
                  mappedRarity = 'U_FOIL';
                }
              }
              // 如果上面都没匹配到，尝试从rarityMap中查找
              if (!mappedRarity) {
                for (const [key, value] of Object.entries(rarityMap)) {
                  if (lowerRarity.includes(key.toLowerCase())) {
                    mappedRarity = value;
                    break;
                  }
                }
              }
            }

            // 如果还是没匹配到，使用默认值
            if (!mappedRarity) {
              mappedRarity = gameType === 'rune' ? 'N' : 'common';
              if (isDebug && i <= 10) {
                console.log(`[IMPORT]   稀有度未匹配，使用默认值: ${mappedRarity}`);
              }
            } else if (isDebug && i <= 10) {
              console.log(`[IMPORT]   稀有度匹配成功: [${rarityStr}] -> ${mappedRarity}`);
            }

            const itemData = {
              // 如果是全局模板，不设置 userId
              ...(isGlobal ? {} : { userId: req.user._id }),
              isTemplate: isGlobal,
              itemName: String(itemName).trim(),
              rarity: mappedRarity,
              itemType: typeMap[String(typeValue)] || 'card',
              quantity: (() => {
                const parsed = parseInt(quantityValue);
                return !isNaN(parsed) ? parsed : 1;
              })(),
              value: parseFloat(priceValue) || 0,
              description: String(descValue).trim(),
              gameType: gameType
            };

            if (gameType === 'rune' && (cardNumValue || versionValue)) {
              itemData.runeCardInfo = {
                version: versionMap[String(versionValue)] || 'OGN',
                cardNumber: String(cardNumValue).trim() || ''
              };
            }

            if (gameType === 'rune' && cardPropertyValue) {
              const trimmedCardProperty = String(cardPropertyValue).trim();
              if (validCardProperties.includes(trimmedCardProperty)) {
                itemData.cardProperty = trimmedCardProperty;
              }
            }

            let duplicate = null;
            const baseQuery = isGlobal ? { isTemplate: true } : { userId: req.user._id };
            
            if (gameType === 'rune' && itemData.runeCardInfo?.cardNumber) {
              duplicate = await InventoryItem.findOne({
                ...baseQuery,
                itemName: itemData.itemName,
                'runeCardInfo.cardNumber': itemData.runeCardInfo.cardNumber
              });
            } else {
              duplicate = await InventoryItem.findOne({
                ...baseQuery,
                itemName: itemData.itemName
              });
            }

            if (duplicate) {
              // 检查是否数据完全一致
              const isRuneMatch = 
                gameType === 'rune' ? 
                JSON.stringify(duplicate.runeCardInfo || {}) === JSON.stringify(itemData.runeCardInfo || {}) :
                true;
              
              const isDataMatch =
                duplicate.quantity === itemData.quantity &&
                duplicate.value === itemData.value &&
                duplicate.rarity === itemData.rarity &&
                duplicate.itemType === itemData.itemType &&
                duplicate.description === itemData.description &&
                isRuneMatch &&
                duplicate.cardProperty === (itemData.cardProperty || undefined);
              
              if (isDataMatch) {
                // 数据完全一致：覆盖（更新 updatedAt）
                duplicate.updatedAt = Date.now();
                await duplicate.save();
                results.unchanged++;
              } else {
                // 数据一致有缺失的进行补全，数据不一致的进行更新
                duplicate.quantity = itemData.quantity;
                duplicate.value = itemData.value;
                duplicate.rarity = itemData.rarity;
                duplicate.itemType = itemData.itemType;
                
                // 只有当导入有描述时才更新，否则保留原数据
                if (itemData.description !== undefined && itemData.description !== '') {
                  duplicate.description = itemData.description;
                }
                
                if (itemData.runeCardInfo) {
                  duplicate.runeCardInfo = itemData.runeCardInfo;
                }
                if (itemData.cardProperty !== undefined) {
                  duplicate.cardProperty = itemData.cardProperty;
                }
                await duplicate.save();
                results.updated++;
              }
            } else {
              // 数据不一致的新增
              await InventoryItem.create(itemData);
              results.created++;
            }

          } catch (error) {
            results.failed++;
            results.errors.push({ row: rowNum, sheet: sheetName, error: error.message });
          }
        }
      }

      console.log('[IMPORT] Results:', JSON.stringify(results));
      res.json({
        success: true,
        message: `导入完成：新增 ${results.created} 条，更新 ${results.updated} 条，无变化 ${results.unchanged} 条，失败 ${results.failed} 条`,
        data: results
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.get('/:id', protect, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    // 只有当物品有 userId 且不是当前用户时才拒绝访问
    if (
      item.userId &&
      item.userId.toString() !== req.user._id.toString() &&
      req.user.role === 'user'
    ) {
      return res.status(403).json({ message: '无权访问此物品' });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: '物品不存在' });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/',
  protect,
  [
    body('itemName').trim().notEmpty().withMessage('物品名称是必填项'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('数量必须是非负整数'),
    body('itemType').optional().notEmpty().withMessage('物品类型不能为空'),
    body('value').optional().isFloat({ min: 0 }).withMessage('价值不能为负数')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { itemName, gameType, itemType, quantity, value, description, tags, rarity, runeCardInfo, cardProperty, isGlobalTemplate } = req.body;
      
      const newItem = await InventoryItem.create({
        // 如果是全局模板，不设置 userId
        ...(isGlobalTemplate ? {} : { userId: req.user._id }),
        isTemplate: isGlobalTemplate || false,
        itemName,
        gameType,
        itemType: itemType || 'card',
        quantity: quantity ?? 1,
        value: value || 0,
        description,
        tags: tags || [],
        rarity: rarity || 'N',
        ...(gameType === 'rune' && runeCardInfo && { runeCardInfo }),
        ...(gameType === 'rune' && cardProperty && { cardProperty })
      });

      res.status(201).json({
        success: true,
        message: '物品添加成功',
        data: newItem
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.put('/:id',
  protect,
  [
    body('quantity').optional().isInt({ min: 0 }).withMessage('数量必须是非负整数'),
    body('value').optional().isFloat({ min: 0 }).withMessage('价值不能为负数')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let item = await InventoryItem.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ message: '物品不存在' });
      }

      const isOwner = !item.userId || item.userId.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: '无权修改此物品' });
      }

      if (req.user.role === 'user') {
        if (!isOwner) {
          return res.status(403).json({ message: '只能修改自己的物品' });
        }

        const allowedFields = ['quantity', 'value'];
        const requestedFields = Object.keys(req.body);
        const hasInvalidFields = requestedFields.some(field => !allowedFields.includes(field));

        if (hasInvalidFields) {
          return res.status(403).json({ message: '普通用户只能修改数量和价格' });
        }
      }

      if (isAdmin) {
        const { itemName, itemType, quantity, value, description, tags, rarity, runeCardInfo, cardProperty } = req.body;
        if (itemName) item.itemName = itemName;
        if (itemType) item.itemType = itemType;
        if (quantity !== undefined) item.quantity = quantity;
        if (value !== undefined) item.value = value;
        if (description !== undefined) item.description = description;
        if (tags) item.tags = tags;
        if (rarity) item.rarity = rarity;
        if (runeCardInfo) item.runeCardInfo = runeCardInfo;
        if (cardProperty !== undefined) item.cardProperty = cardProperty;
      } else {
        if (req.body.quantity !== undefined) {
          item.quantity = req.body.quantity;
        }
        if (req.body.value !== undefined) {
          item.value = req.body.value;
        }
      }

      await item.save();

      res.json({
        success: true,
        message: '物品更新成功',
        data: item
      });
    } catch (error) {
      console.error(error);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: '物品不存在' });
      }
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    const isOwner = !item.userId || item.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '无权删除此物品' });
    }

    await InventoryItem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '物品已删除'
    });
  } catch (error) {
      console.error(error);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: '物品不存在' });
      }
      res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/:id/image',
  protect,
  authorize('admin', 'superadmin'),
  imageUpload.single('image'),
  async (req, res) => {
    try {
      const item = await InventoryItem.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ message: '物品不存在' });
      }

      if (!req.file) {
        return res.status(400).json({ message: '请上传图片文件' });
      }

      const imageBase64 = req.file.buffer.toString('base64');
      const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

      if (!item.images) {
        item.images = [];
      }
      item.images = [imageDataUrl];

      await item.save();

      res.json({
        success: true,
        message: '图片上传成功',
        data: item
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.delete('/:id/image',
  protect,
  authorize('admin', 'superadmin'),
  async (req, res) => {
    try {
      const item = await InventoryItem.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ message: '物品不存在' });
      }

      item.images = [];
      await item.save();

      res.json({
        success: true,
        message: '图片已删除'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

module.exports = router;