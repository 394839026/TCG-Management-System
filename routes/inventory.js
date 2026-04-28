const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const xlsx = require('xlsx');
const InventoryItem = require('../models/Inventory');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
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

// @route   GET /api/inventory
// @desc    获取当前用户的库存列表
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { itemType, search, sort = 'createdAt', order = 'desc' } = req.query;

    // 构建查询条件
    const query = { userId: req.user._id };

    if (itemType && itemType !== 'all') {
      query.itemType = itemType;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // 排序
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sort]: sortOrder };

    const items = await InventoryItem.find(query).sort(sortOptions);

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/inventory/stats
// @desc    获取库存统计信息
// @access  Private
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

    res.json({
      success: true,
      data: {
        byType: stats,
        totalItems,
        totalValue
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/inventory/:id
// @desc    获取单个库存物品详情
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    // 检查权限：用户只能查看自己的，管理员和超级管理员可以查看所有
    if (
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

// @route   POST /api/inventory
// @desc    添加新的库存物品
// @access  Private
router.post('/',
  protect,
  (req, res, next) => {
    console.log('POST /api/inventory called by user:', req.user?._id, 'role:', req.user?.role);
    next();
  },
  [
    body('itemName').trim().notEmpty().withMessage('物品名称是必填项'),
    body('quantity').isInt({ min: 0 }).withMessage('数量必须是非负整数'),
    body('itemType').optional().isIn(['card', 'booster', 'box', 'accessory', 'other']).withMessage('无效的物品类型'),
    body('condition').optional().isIn(['mint', 'near_mint', 'excellent', 'good', 'fair', 'poor']).withMessage('无效的物品状态'),
    body('value').optional().isFloat({ min: 0 }).withMessage('价值不能为负数')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { itemName, itemType, quantity, condition, value, description, tags } = req.body;

      const newItem = await InventoryItem.create({
        userId: req.user._id,
        itemName,
        itemType: itemType || 'card',
        quantity,
        condition: condition || 'near_mint',
        value: value || 0,
        description,
        tags: tags || []
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

// @route   PUT /api/inventory/:id
// @desc    更新库存物品
// @access  Private
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

      // 检查权限
      const isOwner = item.userId.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: '无权修改此物品' });
      }

      // 普通用户只能修改自己的物品，且只能修改数量
      if (req.user.role === 'user') {
        if (!isOwner) {
          return res.status(403).json({ message: '只能修改自己的物品' });
        }
        
        // 普通用户只能修改数量字段
        const allowedFields = ['quantity'];
        const requestedFields = Object.keys(req.body);
        const hasInvalidFields = requestedFields.some(field => !allowedFields.includes(field));
        
        if (hasInvalidFields) {
          return res.status(403).json({ message: '普通用户只能修改数量' });
        }
      }

      // 更新字段（根据角色）
      if (isAdmin) {
        // 管理员可以修改所有字段
        const { itemName, itemType, quantity, condition, value, description, tags } = req.body;
        if (itemName) item.itemName = itemName;
        if (itemType) item.itemType = itemType;
        if (quantity !== undefined) item.quantity = quantity;
        if (condition) item.condition = condition;
        if (value !== undefined) item.value = value;
        if (description !== undefined) item.description = description;
        if (tags) item.tags = tags;
      } else {
        // 普通用户只能修改数量
        if (req.body.quantity !== undefined) {
          item.quantity = req.body.quantity;
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

// @route   DELETE /api/inventory/:id
// @desc    删除库存物品
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    // 检查权限
    const isOwner = item.userId.toString() === req.user._id.toString();
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

// @route   GET /api/inventory/admin/users/:userId
// @desc    管理员查看指定用户的库存
// @access  Private (Admin & Superadmin)
router.get('/admin/users/:userId',
  protect,
  authorize('admin', 'superadmin'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      const items = await InventoryItem.find({ userId: req.params.userId });

      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        count: items.length,
        data: items
      });
    } catch (error) {
      console.error(error);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: '用户不存在' });
      }
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   POST /api/inventory/import
// @desc    从Excel文件导入物品（仅管理员）
// @access  Private (Admin & Superadmin)
router.post('/import',
  protect,
  authorize('admin', 'superadmin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: '请上传Excel文件' });
      }

      // 解析Excel文件
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        return res.status(400).json({ message: 'Excel文件为空' });
      }

      // 稀有度映射
      const rarityMap = {
        '普通': 'common',
        'common': 'common',
        '非普通': 'uncommon',
        'uncommon': 'uncommon',
        '稀有': 'rare',
        'rare': 'rare',
        '超稀有': 'super_rare',
        'super_rare': 'super_rare',
        '极稀有': 'ultra_rare',
        'ultra_rare': 'ultra_rare',
        '秘密稀有': 'secret_rare',
        'secret_rare': 'secret_rare',
        '其他': 'other',
        'other': 'other'
      };

      // 类型映射
      const typeMap = {
        '卡牌': 'card',
        'card': 'card',
        '补充包': 'booster',
        'booster': 'booster',
        '盒装': 'box',
        'box': 'box',
        '配件': 'accessory',
        'accessory': 'accessory',
        '其他': 'other',
        'other': 'other'
      };

      // 状态映射
      const conditionMap = {
        '完美': 'mint',
        'mint': 'mint',
        '近完美': 'near_mint',
        'near_mint': 'near_mint',
        '极佳': 'excellent',
        'excellent': 'excellent',
        '良好': 'good',
        'good': 'good',
        '一般': 'fair',
        'fair': 'fair',
        '较差': 'poor',
        'poor': 'poor'
      };

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      // 处理每一行数据
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNum = i + 2; // Excel行号（从2开始，因为第1行是表头）

        try {
          // 验证必填字段
          if (!row['名称'] && !row['itemName']) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: '缺少物品名称'
            });
            continue;
          }

          // 构建物品数据
          const itemData = {
            userId: req.user._id,
            itemNo: row['编号'] || row['itemNo'] || null,
            itemName: row['名称'] || row['itemName'],
            itemCode: row['编码'] || row['itemCode'] || null,
            rarity: rarityMap[row['稀有度'] || row['rarity']] || 'common',
            itemType: typeMap[row['类型'] || row['itemType']] || 'card',
            quantity: parseInt(row['数量'] || row['quantity']) || 0,
            value: parseFloat(row['价格'] || row['value']) || 0,
            condition: conditionMap[row['状态'] || row['condition']] || 'near_mint',
            description: row['描述'] || row['description'] || null
          };

          // 验证数量
          if (itemData.quantity < 0) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: '数量不能为负数'
            });
            continue;
          }

          // 验证价格
          if (itemData.value < 0) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: '价格不能为负数'
            });
            continue;
          }

          // 创建物品
          await InventoryItem.create(itemData);
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

// @route   GET /api/inventory/template
// @desc    下载Excel导入模板
// @access  Public
router.get('/template', (req, res) => {
  try {
    // 创建模板数据
    const templateData = [
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
      }
    ];

    // 创建工作簿
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);

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

    xlsx.utils.book_append_sheet(wb, ws, '库存模板');

    // 生成Excel文件
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_template.xlsx');
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
