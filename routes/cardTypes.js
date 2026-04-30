const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const xlsx = require('xlsx');
const CardType = require('../models/CardType');
const { protect, authorize } = require('../middleware/auth');

const upload = multer({
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

router.get('/', protect, async (req, res) => {
  try {
    const { search, gameType } = req.query;
    
    const query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (gameType && gameType !== 'all') {
      query.gameType = gameType;
    }
    
    const types = await CardType.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: types.length,
      data: types
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/template', (req, res) => {
  try {
    const templateData = [
      {
        '名称': '卡牌',
        '游戏类型': '符文战场',
        '卡牌属性': '单位',
        '描述': '单张卡牌'
      },
      {
        '名称': '符文道具',
        '游戏类型': '符文战场',
        '卡牌属性': '符文',
        '描述': '符文类卡牌'
      },
      {
        '名称': '补充包',
        '游戏类型': '数码宝贝',
        '卡牌属性': '',
        '描述': '未开封的补充包'
      },
      {
        '名称': '周边',
        '游戏类型': '宝可梦',
        '卡牌属性': '',
        '描述': '游戏周边产品'
      }
    ];
    
    // 说明数据
    const instructionsData = [
      { '说明': '卡牌类型导入模板说明' },
      { '说明': '' },
      { '说明': '游戏类型可选值：' },
      { '说明': ' - 符文战场 (rune)' },
      { '说明': ' - 数码宝贝 (digimon)' },
      { '说明': ' - 宝可梦 (pokemon)' },
      { '说明': ' - 影之诗进化对决 (shadowverse-evolve)' },
      { '说明': '' },
      { '说明': '卡牌属性可选值（仅符文战场卡牌需要）：' },
      { '说明': ' - 传奇' },
      { '说明': ' - 英雄' },
      { '说明': ' - 专属' },
      { '说明': ' - 单位' },
      { '说明': ' - 装备' },
      { '说明': ' - 法术' },
      { '说明': ' - 战场' },
      { '说明': ' - 指示物' },
      { '说明': ' - 符文' },
      { '说明': '' },
      { '说明': '注意事项：' },
      { '说明': '1. 名称和游戏类型为必填项' },
      { '说明': '2. 卡牌属性仅在游戏类型为符文战场时有效' },
      { '说明': '3. 名称与游戏类型组合必须唯一' }
    ];
    
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wsInstructions = xlsx.utils.json_to_sheet(instructionsData, { header: ['说明'] });
    
    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 40 }
    ];
    
    wsInstructions['!cols'] = [
      { wch: 60 }
    ];
    
    xlsx.utils.book_append_sheet(wb, wsInstructions, '模板说明');
    xlsx.utils.book_append_sheet(wb, ws, '卡牌类型模板');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=card_type_template.xlsx');
    res.send(buffer);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/export', protect, async (req, res) => {
  try {
    const { gameType } = req.query;
    
    const query = {};
    if (gameType && gameType !== 'all') {
      query.gameType = gameType;
    }
    
    const types = await CardType.find(query).sort({ createdAt: -1 });
    
    const gameTypeReverseMap = {
      'rune': '符文战场',
      'digimon': '数码宝贝',
      'pokemon': '宝可梦',
      'shadowverse-evolve': '影之诗进化对决'
    };
    
    const exportData = types.map(type => ({
      '名称': type.name,
      '游戏类型': gameTypeReverseMap[type.gameType] || type.gameType,
      '卡牌属性': type.cardProperty || '',
      '描述': type.description || '',
      '创建时间': type.createdAt ? type.createdAt.toLocaleDateString('zh-CN') : ''
    }));
    
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(exportData);
    
    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 40 },
      { wch: 15 }
    ];
    
    xlsx.utils.book_append_sheet(wb, ws, '卡牌类型');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=card_types_export.xlsx');
    res.send(buffer);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const type = await CardType.findById(req.params.id);
    
    if (!type) {
      return res.status(404).json({ message: '卡牌类型不存在' });
    }
    
    res.json({
      success: true,
      data: type
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: '卡牌类型不存在' });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/',
  protect,
  authorize('superadmin'),
  [
    body('name').trim().notEmpty().withMessage('类型名称是必填项'),
    body('gameType').isIn(['rune', 'digimon', 'pokemon', 'shadowverse-evolve']).withMessage('无效的游戏类型'),
    body('cardProperty').optional().isIn(['传奇', '英雄', '专属', '单位', '装备', '法术', '战场', '指示物', '符文']).withMessage('无效的卡牌属性')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { name, gameType, cardProperty, description } = req.body;
      
      const existingType = await CardType.findOne({ name, gameType });
      if (existingType) {
        return res.status(400).json({ message: '该游戏类型下已存在同名卡牌类型' });
      }
      
      // 只对符文战场类型保存卡牌属性
      const finalCardProperty = gameType === 'rune' ? (cardProperty || null) : null;
      
      const newType = await CardType.create({
        name,
        gameType,
        cardProperty: finalCardProperty,
        description
      });
      
      res.status(201).json({
        success: true,
        message: '卡牌类型创建成功',
        data: newType
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ message: '该卡牌类型已存在' });
      }
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.put('/:id',
  protect,
  authorize('superadmin'),
  [
    body('name').optional().trim().notEmpty().withMessage('类型名称不能为空'),
    body('gameType').optional().isIn(['rune', 'digimon', 'pokemon', 'shadowverse-evolve']).withMessage('无效的游戏类型'),
    body('cardProperty').optional().isIn(['传奇', '英雄', '专属', '单位', '装备', '法术', '战场', '指示物', '符文']).withMessage('无效的卡牌属性')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const type = await CardType.findById(req.params.id);
      
      if (!type) {
        return res.status(404).json({ message: '卡牌类型不存在' });
      }
      
      const { name, gameType, cardProperty, description } = req.body;
      
      if (name && name !== type.name) {
        const existingType = await CardType.findOne({ name, gameType: gameType || type.gameType });
        if (existingType) {
          return res.status(400).json({ message: '该游戏类型下已存在同名卡牌类型' });
        }
        type.name = name;
      }
      
      if (gameType) {
        type.gameType = gameType;
      }
      
      // 处理卡牌属性：只对符文战场类型保存
      if (cardProperty !== undefined) {
        type.cardProperty = type.gameType === 'rune' ? (cardProperty || null) : null;
      }
      
      if (description !== undefined) {
        type.description = description;
      }
      
      await type.save();
      
      res.json({
        success: true,
        message: '卡牌类型更新成功',
        data: type
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ message: '该卡牌类型已存在' });
      }
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.delete('/:id',
  protect,
  authorize('superadmin'),
  async (req, res) => {
    try {
      const type = await CardType.findById(req.params.id);
      
      if (!type) {
        return res.status(404).json({ message: '卡牌类型不存在' });
      }
      
      await CardType.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: '卡牌类型已删除'
      });
    } catch (error) {
      console.error(error);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: '卡牌类型不存在' });
      }
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

router.post('/import',
  protect,
  authorize('superadmin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: '请上传Excel文件' });
      }
      
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        return res.status(400).json({ message: 'Excel文件为空' });
      }
      
      const gameTypeMap = {
        '符文战场': 'rune',
        'rune': 'rune',
        '数码宝贝': 'digimon',
        'digimon': 'digimon',
        '宝可梦': 'pokemon',
        'pokemon': 'pokemon',
        '影之诗进化对决': 'shadowverse-evolve',
        'shadowverse-evolve': 'shadowverse-evolve'
      };
      
      const validCardProperties = ['传奇', '英雄', '专属', '单位', '装备', '法术', '战场', '指示物', '符文'];
      
      const results = {
        created: 0,
        updated: 0,
        unchanged: 0,
        failed: 0,
        errors: []
      };
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNum = i + 2;
        
        try {
          if (!row['名称'] && !row['name']) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: '缺少类型名称'
            });
            continue;
          }
          
          const gameTypeValue = row['游戏类型'] || row['gameType'];
          if (!gameTypeValue) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: '缺少游戏类型'
            });
            continue;
          }
          
          const mappedGameType = gameTypeMap[gameTypeValue];
          if (!mappedGameType) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: '无效的游戏类型'
            });
            continue;
          }
          
          const name = row['名称'] || row['name'];
          
          // 处理卡牌属性
          let cardProperty = null;
          if (mappedGameType === 'rune') {
            const rawCardProperty = row['卡牌属性'] || row['cardProperty'] || '';
            if (rawCardProperty && validCardProperties.includes(rawCardProperty)) {
              cardProperty = rawCardProperty;
            }
          }
          
          const description = row['描述'] || row['description'] || '';
          
          // 查找已存在的类型
          const existingType = await CardType.findOne({
            name,
            gameType: mappedGameType
          });
          
          if (existingType) {
            // 检查是否数据完全一致
            const existingCardProp = existingType.cardProperty || null;
            const existingDesc = existingType.description || '';
            
            const isDataMatch = 
              existingCardProp === cardProperty && 
              existingDesc === description;
            
            if (isDataMatch) {
              // 数据完全一致：覆盖（更新 updatedAt）
              existingType.updatedAt = Date.now();
              await existingType.save();
              results.unchanged++;
            } else {
              // 数据一致有缺失的进行补全，数据不一致的进行更新
              if (cardProperty !== undefined) {
                existingType.cardProperty = cardProperty;
              }
              if (description !== undefined && description !== '') {
                existingType.description = description;
              } else if (description === '' && existingType.description) {
                // 如果导入为空但原数据有值，保留原数据
              } else if (description === '') {
                existingType.description = '';
              }
              await existingType.save();
              results.updated++;
            }
          } else {
            // 数据不一致的新增
            await CardType.create({
              name,
              gameType: mappedGameType,
              cardProperty,
              description
            });
            results.created++;
          }
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            error: error.message
          });
        }
      }
      
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

module.exports = router;