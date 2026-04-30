const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// @route   POST /api/shops
// @desc    创建店铺
// @access  Private (personal用户)
router.post('/', protect, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('店铺名称需要2-100个字符'),
  body('description').optional().isLength({ max: 1000 }).withMessage('描述不能超过1000个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, logo, coverImage, location, contactInfo, businessHours } = req.body;

    // 检查店铺名称是否已存在
    const existingShop = await Shop.findOne({ name });
    if (existingShop) {
      return res.status(400).json({ message: '店铺名称已被使用' });
    }

    // 处理 location - 如果是字符串，转换为对象格式
    let locationData = location;
    if (typeof location === 'string') {
      locationData = { address: location };
    }

    const shop = new Shop({
      name,
      description,
      logo,
      coverImage,
      owner: req.user._id,
      employees: [{
        user: req.user._id,
        role: 'manager',
        permissions: {
          canManageInventory: true,
          canRecordSales: true,
          canViewReports: true
        }
      }],
      location: locationData,
      contactInfo,
      businessHours
    });

    await shop.save();

    // 更新用户的shops数组
    await User.findByIdAndUpdate(req.user._id, {
      $push: { shops: shop._id }
    });

    res.status(201).json({
      success: true,
      message: '店铺创建成功',
      data: shop
    });
  } catch (error) {
    console.error('创建店铺错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops
// @desc    获取店铺列表
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search ? {
      $or: [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ]
    } : {};

    const filter = req.query.isPublic !== undefined ? {
      ...searchQuery,
      'settings.isPublic': req.query.isPublic === 'true'
    } : searchQuery;

    const shops = await Shop.find(filter)
      .populate('owner', 'username avatar')
      .select('-salesRecords -financialStats')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shop.countDocuments(filter);

    res.json({
      success: true,
      count: shops.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: shops
    });
  } catch (error) {
    console.error('获取店铺列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:id
// @desc    获取店铺详情
// @access  Public (公开店铺) / Private (员工)
router.get('/:id', protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('owner', 'username avatar email')
      .populate('employees.user', 'username avatar');

    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查访问权限
    if (!shop.settings.isPublic) {
      const isEmployee = shop.employees.some(e => e.user._id.toString() === req.user._id.toString());
      const isOwner = shop.owner._id.toString() === req.user._id.toString();
      
      if (!isEmployee && !isOwner && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: '您不是该店铺员工' });
      }
    }

    // 如果不显示销售记录,则移除
    if (!shop.settings.showSalesRecords) {
      shop.salesRecords = undefined;
    }

    res.json({
      success: true,
      data: shop
    });
  } catch (error) {
    console.error('获取店铺详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/shops/:id
// @desc    更新店铺信息
// @access  Private (owner/manager with ABAC)
router.put('/:id', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { name, description, logo, coverImage, location, contactInfo, businessHours, settings } = req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 更新字段
    if (name) shop.name = name;
    if (description !== undefined) shop.description = description;
    if (logo !== undefined) shop.logo = logo;
    if (coverImage !== undefined) shop.coverImage = coverImage;
    if (location) shop.location = { ...shop.location, ...location };
    if (contactInfo) shop.contactInfo = { ...shop.contactInfo, ...contactInfo };
    if (businessHours) shop.businessHours = { ...shop.businessHours, ...businessHours };
    if (settings) shop.settings = { ...shop.settings, ...settings };

    await shop.save();

    res.json({
      success: true,
      message: '店铺信息更新成功',
      data: shop
    });
  } catch (error) {
    console.error('更新店铺错误:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '店铺名称已被使用' });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/shops/:id
// @desc    关闭店铺
// @access  Private (仅owner)
router.delete('/:id', protect, abac({ resource: 'shop', actions: ['delete'] }), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 移除所有员工的shops引用
    await User.updateMany(
      { _id: { $in: shop.employees.map(e => e.user) } },
      { $pull: { shops: shop._id } }
    );

    await shop.deleteOne();

    res.json({
      success: true,
      message: '店铺已关闭'
    });
  } catch (error) {
    console.error('关闭店铺错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/shops/:id/employees
// @desc    添加员工
// @access  Private (owner/manager)
router.post('/:id/employees', protect, abac({ resource: 'shop', actions: ['manage'] }), async (req, res) => {
  try {
    const { userId, role, permissions } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否已是员工
    const isEmployee = shop.employees.some(e => e.user.toString() === userId);
    if (isEmployee) {
      return res.status(400).json({ message: '该用户已是店铺员工' });
    }

    shop.employees.push({
      user: userId,
      role: role || 'staff',
      permissions: permissions || {
        canManageInventory: false,
        canRecordSales: false,
        canViewReports: false
      }
    });

    await shop.save();

    // 更新用户的shops数组
    await User.findByIdAndUpdate(userId, {
      $push: { shops: shop._id }
    });

    res.status(201).json({
      success: true,
      message: '员工添加成功',
      data: shop
    });
  } catch (error) {
    console.error('添加员工错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/shops/:id/sales
// @desc    记录销售/收购
// @access  Private (员工with permission)
router.post('/:id/sales', protect, abac({ resource: 'shop', actions: ['write'] }), [
  body('quantity').isInt({ min: 1 }).withMessage('数量至少为1'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('单价不能为负数'),
  body('saleType').isIn(['sell', 'buy', 'trade']).withMessage('交易类型无效')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { item, quantity, unitPrice, saleType, customerName, notes } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const totalPrice = quantity * unitPrice;

    shop.salesRecords.push({
      item,
      quantity,
      unitPrice,
      totalPrice,
      saleType,
      customerName,
      soldBy: req.user._id,
      notes
    });

    // 更新财务统计
    if (saleType === 'sell') {
      shop.financialStats.totalRevenue += totalPrice;
      shop.financialStats.monthlyRevenue += totalPrice;
    } else if (saleType === 'buy') {
      shop.financialStats.totalExpenses += totalPrice;
    }
    shop.financialStats.lastUpdated = Date.now();

    await shop.save();

    res.status(201).json({
      success: true,
      message: '销售记录已添加',
      data: shop
    });
  } catch (error) {
    console.error('添加销售记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:id/sales
// @desc    获取销售记录
// @access  Private (员工with permission)
router.get('/:id/sales', protect, abac({ resource: 'shop', actions: ['read'] }), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 支持筛选
    let salesRecords = shop.salesRecords;
    
    if (req.query.saleType) {
      salesRecords = salesRecords.filter(r => r.saleType === req.query.saleType);
    }
    
    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      salesRecords = salesRecords.filter(r => r.soldAt >= startDate);
    }
    
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      salesRecords = salesRecords.filter(r => r.soldAt <= endDate);
    }

    res.json({
      success: true,
      count: salesRecords.length,
      data: salesRecords
    });
  } catch (error) {
    console.error('获取销售记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:id/dashboard
// @desc    获取经营看板数据
// @access  Private (owner/manager)
router.get('/:id/dashboard', protect, abac({ resource: 'shop', actions: ['read'] }), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 今日销售
    const todaySales = shop.salesRecords.filter(r => 
      r.soldAt >= startOfDay && r.saleType === 'sell'
    ).reduce((sum, r) => sum + r.totalPrice, 0);

    // 本月销售
    const monthlySales = shop.salesRecords.filter(r => 
      r.soldAt >= startOfMonth && r.saleType === 'sell'
    ).reduce((sum, r) => sum + r.totalPrice, 0);

    // 销售笔数
    const transactionCount = shop.salesRecords.filter(r => 
      r.soldAt >= startOfMonth
    ).length;

    res.json({
      success: true,
      data: {
        financialStats: shop.financialStats,
        todaySales,
        monthlySales,
        transactionCount,
        employeeCount: shop.employees.length,
        totalSalesRecords: shop.salesRecords.length
      }
    });
  } catch (error) {
    console.error('获取经营看板错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
