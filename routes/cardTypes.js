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
        '描述': '单张卡牌'
      },
      {
        '名称': '补充包',
        '游戏类型': '数码宝贝',
        '描述': '未开封的补充包'
      },
      {
        '名称': '周边',
        '游戏类型': '宝可梦',
        '描述': '游戏周边产品'
      }
    ];
    
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);
    
    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 40 }
    ];
    
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
    body('gameType').isIn(['rune', 'digimon', 'pokemon']).withMessage('无效的游戏类型')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { name, gameType, description } = req.body;
      
      const existingType = await CardType.findOne({ name, gameType });
      if (existingType) {
        return res.status(400).json({ message: '该游戏类型下已存在同名卡牌类型' });
      }
      
      const newType = await CardType.create({
        name,
        gameType,
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
    body('gameType').optional().isIn(['rune', 'digimon', 'pokemon']).withMessage('无效的游戏类型')
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
      
      const { name, gameType, description } = req.body;
      
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
        'pokemon': 'pokemon'
      };
      
      const results = {
        success: 0,
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
          
          const existingType = await CardType.findOne({
            name: row['名称'] || row['name'],
            gameType: mappedGameType
          });
          
          if (existingType) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: '该卡牌类型已存在'
            });
            continue;
          }
          
          await CardType.create({
            name: row['名称'] || row['name'],
            gameType: mappedGameType,
            description: row['描述'] || row['description'] || ''
          });
          
          results.success++;
          
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
        message: `导入完成：成功 ${results.success} 条，失败 ${results.failed} 条`,
        data: results
      });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

module.exports = router;