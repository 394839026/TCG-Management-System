const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const { upload, handleUploadError } = require('../middleware/upload');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Team = require('../models/Team');
const ShopInventoryItem = require('../models/ShopInventoryItem');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

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

    const { name, description, logo, coverImage, location, contactInfo, businessHours, type } = req.body;

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
      type: type || 'physical',
      employees: [{
        user: req.user._id,
        role: 'operator',
        permissions: {
          canManageInventory: true,
          canRecordSales: true,
          canViewReports: true,
          canManageEmployees: true
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
    const { name, description, logo, coverImage, location, contactInfo, businessHours, settings, type } = req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 更新字段
    if (name) shop.name = name;
    if (description !== undefined) shop.description = description;
    if (logo !== undefined) shop.logo = logo;
    if (coverImage !== undefined) shop.coverImage = coverImage;
    if (type !== undefined) shop.type = type;
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
// @access  Private (owner)
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

// @route   GET /api/shops/:id/employees
// @desc    获取店铺员工列表
// @access  Private (owner/manager)
router.get('/:id/employees', protect, abac({ resource: 'shop', actions: ['read'] }), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('employees.user', 'username email');
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    res.json({
      success: true,
      data: shop.employees
    });
  } catch (error) {
    console.error('获取员工列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/shops/:id/employees
// @desc    添加员工
// @access  Private (owner/manager)
router.post('/:id/employees', protect, abac({ resource: 'shop', actions: ['manage'] }), async (req, res) => {
  try {
    const { email, role } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 通过邮箱查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: '未找到该邮箱对应的用户' });
    }

    // 检查是否已是员工
    const isEmployee = shop.employees.some(e => e.user.toString() === user._id.toString());
    if (isEmployee) {
      return res.status(400).json({ message: '该用户已是店铺员工' });
    }

    // 根据角色设置权限
    const permissions = (role === 'owner' || role === 'operator') ? {
      canManageInventory: true,
      canRecordSales: true,
      canViewReports: true,
      canManageEmployees: true
    } : {
      canManageInventory: true, // 员工可以上架下架
      canRecordSales: false,
      canViewReports: false,
      canManageEmployees: false
    };

    shop.employees.push({
      user: user._id,
      role: role || 'staff',
      permissions
    });

    await shop.save();

    // 更新用户的shops数组
    await User.findByIdAndUpdate(user._id, {
      $push: { shops: shop._id }
    });

    res.status(201).json({
      success: true,
      message: '员工添加成功'
    });
  } catch (error) {
    console.error('添加员工错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/shops/:id/employees/:employeeId
// @desc    移除员工
// @access  Private (owner/manager)
router.delete('/:id/employees/:employeeId', protect, abac({ resource: 'shop', actions: ['manage'] }), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 找到要移除的员工
    const employeeIndex = shop.employees.findIndex(e => e._id.toString() === req.params.employeeId);
    if (employeeIndex === -1) {
      return res.status(404).json({ message: '未找到该员工' });
    }

    const removedEmployee = shop.employees[employeeIndex];

    // 不能移除店主
    if (removedEmployee.role === 'owner' && shop.owner.toString() === removedEmployee.user.toString()) {
      return res.status(400).json({ message: '不能移除店主' });
    }

    // 从数组中移除
    shop.employees.splice(employeeIndex, 1);
    await shop.save();

    // 更新用户的shops数组
    await User.findByIdAndUpdate(removedEmployee.user, {
      $pull: { shops: shop._id }
    });

    res.json({
      success: true,
      message: '员工已移除'
    });
  } catch (error) {
    console.error('移除员工错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/shops/:id/employees/:employeeId/role
// @desc    更新员工角色
// @access  Private (owner/manager)
router.put('/:id/employees/:employeeId/role', protect, abac({ resource: 'shop', actions: ['manage'] }), async (req, res) => {
  try {
    const { role } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 找到要更新的员工
    const employee = shop.employees.find(e => e._id.toString() === req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ message: '未找到该员工' });
    }

    employee.role = role;
    // 根据角色更新权限
    employee.permissions = role === 'owner' ? {
      canManageInventory: true,
      canRecordSales: true,
      canViewReports: true,
      canManageEmployees: true
    } : {
      canManageInventory: false,
      canRecordSales: true,
      canViewReports: false,
      canManageEmployees: false
    };

    await shop.save();

    res.json({
      success: true,
      message: '员工角色已更新',
      data: employee
    });
  } catch (error) {
    console.error('更新员工角色错误:', error);
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

// ==================== 货架管理路由 ====================

// @route   GET /api/shops/:id/shelves
// @desc    获取店铺货架列表（公开访问）
// @access  Public
router.get('/:id/shelves', async (req, res) => {
  try {
    console.log('=== 获取货架列表 ===');
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 获取货架的纯JavaScript对象
    const shelves = shop.shelves.toObject ? shop.shelves.toObject() : JSON.parse(JSON.stringify(shop.shelves));
    console.log('货架数量:', shelves.length);

    // 收集所有需要populate的inventoryItem ID
    const inventoryItemIds = [];
    shelves.forEach((shelf) => {
      if (shelf.items) {
        shelf.items.forEach((item) => {
          if (item.inventoryItem) {
            inventoryItemIds.push(item.inventoryItem);
          }
        });
      }
    });
    console.log('需要populate的库存ID数量:', inventoryItemIds.length);

    // 如果有需要populate的ID，则获取数据
    if (inventoryItemIds.length > 0) {
      try {
        const inventoryItems = await ShopInventoryItem.find({ _id: { $in: inventoryItemIds } })
          .populate('template')
          .populate('addedBy', 'username');

        console.log('找到的库存项数量:', inventoryItems.length);

        // 创建ID到item的映射
        const inventoryItemMap = {};
        inventoryItems.forEach((item) => {
          inventoryItemMap[item._id.toString()] = item.toObject ? item.toObject() : item;
        });

        // 替换货架items中的inventoryItem
        shelves.forEach((shelf) => {
          if (shelf.items) {
            shelf.items.forEach((item) => {
              if (item.inventoryItem) {
                const itemId = item.inventoryItem.toString ? item.inventoryItem.toString() : String(item.inventoryItem);
                if (inventoryItemMap[itemId]) {
                  item.inventoryItem = inventoryItemMap[itemId];
                }
              }
            });
          }
        });
      } catch (populateError) {
        console.error('Populate错误:', populateError);
        // 如果populate失败，只返回原始数据
      }
    } else {
      console.log('没有需要populate的库存项');
    }

    res.json({
      success: true,
      data: shelves
    });
  } catch (error) {
    console.error('获取货架列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/shops/:id/shelves
// @desc    创建新货架
// @access  Private (owner/manager)
router.post('/:id/shelves', protect, abac({ resource: 'shop', actions: ['write'] }), [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('货架名称需要1-50个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), message: errors.array()[0].msg });
    }

    const { name, description, location, capacity } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查货架名称是否已存在
    const existingShelf = shop.shelves.find(s => s.name === name);
    if (existingShelf) {
      return res.status(400).json({ message: '该货架名称已存在' });
    }

    const newShelf = {
      name,
      description: description || '',
      location: location || '',
      capacity: capacity || 0,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    shop.shelves.push(newShelf);
    await shop.save();

    res.status(201).json({
      success: true,
      message: '货架创建成功',
      data: shop.shelves[shop.shelves.length - 1]
    });
  } catch (error) {
    console.error('创建货架错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/shops/:id/shelves/:shelfId
// @desc    更新货架信息
// @access  Private (owner/manager)
router.put('/:id/shelves/:shelfId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { name, description, location, capacity } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const shelf = shop.shelves.id(req.params.shelfId);
    if (!shelf) {
      return res.status(404).json({ message: '货架不存在' });
    }

    // 检查名称冲突
    if (name && name !== shelf.name) {
      const existingShelf = shop.shelves.find(s => s._id.toString() !== req.params.shelfId && s.name === name);
      if (existingShelf) {
        return res.status(400).json({ message: '该货架名称已存在' });
      }
    }

    if (name !== undefined) shelf.name = name;
    if (description !== undefined) shelf.description = description;
    if (location !== undefined) shelf.location = location;
    if (capacity !== undefined) shelf.capacity = capacity;
    shelf.updatedAt = new Date();

    await shop.save();

    res.json({
      success: true,
      message: '货架更新成功',
      data: shelf
    });
  } catch (error) {
    console.error('更新货架错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/shops/:id/shelves/:shelfId
// @desc    删除货架
// @access  Private (owner/manager)
router.delete('/:id/shelves/:shelfId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const shelfIndex = shop.shelves.findIndex(s => s._id.toString() === req.params.shelfId);
    if (shelfIndex === -1) {
      return res.status(404).json({ message: '货架不存在' });
    }

    shop.shelves.splice(shelfIndex, 1);
    await shop.save();

    res.json({
      success: true,
      message: '货架删除成功'
    });
  } catch (error) {
    console.error('删除货架错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/shops/:id/shelves/:shelfId/items
// @desc    添加物品到货架
// @access  Private (owner/manager)
router.post('/:id/shelves/:shelfId/items', protect, abac({ resource: 'shop', actions: ['write'] }), [
  body('inventoryItemId').notEmpty().withMessage('库存物品ID是必填项'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('数量至少为1')
], async (req, res) => {
  try {
    console.log('=== 添加物品到货架开始 ===');
    console.log('用户:', req.user?.username, req.user?._id);
    
    const { inventoryItemId, quantity = 1 } = req.body;
    const shopId = req.params.id;
    const shelfId = req.params.shelfId;

    const shop = await Shop.findById(shopId);
    console.log('店铺:', shop ? shop.name : '未找到');
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }
    
    console.log('员工列表:', shop.employees?.map(e => ({ user: e.user, role: e.role })));

    // 直接遍历找到货架
    let foundShelf = null;
    for (let i = 0; i < shop.shelves.length; i++) {
      if (shop.shelves[i]._id.toString() === shelfId) {
        foundShelf = shop.shelves[i];
        break;
      }
    }

    console.log('货架:', foundShelf ? foundShelf.name : '未找到');
    if (!foundShelf) {
      return res.status(404).json({ message: '货架不存在' });
    }

    const shopInventoryItem = await ShopInventoryItem.findById(inventoryItemId);
    console.log('店铺库存物品:', shopInventoryItem ? '找到' : '未找到');
    if (!shopInventoryItem) {
      return res.status(404).json({ message: '库存物品不存在' });
    }

    // 计算已上架总数
    let totalOnShelves = 0;
    for (const s of shop.shelves) {
      for (const item of s.items) {
        const itemId = typeof item.inventoryItem === 'object' 
          ? item.inventoryItem._id.toString() 
          : item.inventoryItem.toString();
        if (itemId === inventoryItemId) {
          totalOnShelves += item.quantity;
        }
      }
    }
    console.log('已上架总数:', totalOnShelves);

    // 检查是否已在当前货架
    let existingItem = null;
    for (const item of foundShelf.items) {
      const itemId = typeof item.inventoryItem === 'object' 
        ? item.inventoryItem._id.toString() 
        : item.inventoryItem.toString();
      if (itemId === inventoryItemId) {
        existingItem = item;
        break;
      }
    }
    console.log('是否已在货架:', existingItem ? '是' : '否');

    const newQuantity = existingItem 
      ? totalOnShelves - existingItem.quantity + quantity 
      : totalOnShelves + quantity;
    console.log('新数量:', newQuantity, '库存:', shopInventoryItem.quantity);

    if (newQuantity > shopInventoryItem.quantity) {
      return res.status(400).json({ 
        message: `上架数量不能超过库存，当前库存: ${shopInventoryItem.quantity}，已上架: ${totalOnShelves}` 
      });
    }

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      foundShelf.items.push({
        inventoryItem: inventoryItemId,
        quantity: quantity,
        addedAt: new Date()
      });
    }

    foundShelf.updatedAt = new Date();
    console.log('准备保存...');
    await shop.save();
    console.log('保存成功');

    res.json({
      success: true,
      message: '物品添加到货架成功',
      data: foundShelf
    });
    console.log('=== 添加物品到货架完成 ===');
  } catch (error) {
    console.error('添加物品到货架错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ message: '服务器错误: ' + error.message });
  }
});

// @route   PUT /api/shops/:id/shelves/:shelfId/items/:itemId
// @desc    更新货架上的物品
// @access  Private (owner/manager)
router.put('/:id/shelves/:shelfId/items/:itemId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { quantity } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 直接遍历找到货架
    let foundShelf = null;
    for (let i = 0; i < shop.shelves.length; i++) {
      if (shop.shelves[i]._id.toString() === req.params.shelfId) {
        foundShelf = shop.shelves[i];
        break;
      }
    }

    if (!foundShelf) {
      return res.status(404).json({ message: '货架不存在' });
    }

    // 找到物品
    let foundItem = null;
    let foundItemIndex = -1;
    for (let i = 0; i < foundShelf.items.length; i++) {
      if (foundShelf.items[i]._id.toString() === req.params.itemId) {
        foundItem = foundShelf.items[i];
        foundItemIndex = i;
        break;
      }
    }

    if (!foundItem) {
      return res.status(404).json({ message: '物品不存在' });
    }

    if (quantity !== undefined) {
      const shopInventoryItem = await ShopInventoryItem.findById(foundItem.inventoryItem);
      if (!shopInventoryItem) {
        return res.status(404).json({ message: '库存物品不存在' });
      }

      // 计算已上架总数
      let totalOnShelves = 0;
      for (const s of shop.shelves) {
        for (const item of s.items) {
          const itemId = typeof item.inventoryItem === 'object' 
            ? item.inventoryItem._id.toString() 
            : item.inventoryItem.toString();
          if (itemId === foundItem.inventoryItem.toString()) {
            totalOnShelves += item.quantity;
          }
        }
      }
      
      // 计算新的总上架数量
      const newTotalOnShelves = totalOnShelves - foundItem.quantity + quantity;

      // 验证上架数量不超过库存
      if (newTotalOnShelves > shopInventoryItem.quantity) {
        return res.status(400).json({ 
          message: `上架数量不能超过库存，当前库存: ${shopInventoryItem.quantity}，其他货架已上架: ${totalOnShelves - foundItem.quantity}` 
        });
      }

      foundItem.quantity = quantity;
    }
    
    foundShelf.updatedAt = new Date();
    await shop.save();

    res.json({
      success: true,
      message: '货架物品更新成功',
      data: foundItem
    });
  } catch (error) {
    console.error('更新货架物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/shops/:id/shelves/:shelfId/items/:itemId
// @desc    从货架移除物品
// @access  Private (owner/manager)
router.delete('/:id/shelves/:shelfId/items/:itemId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 直接遍历找到货架
    let foundShelf = null;
    for (let i = 0; i < shop.shelves.length; i++) {
      if (shop.shelves[i]._id.toString() === req.params.shelfId) {
        foundShelf = shop.shelves[i];
        break;
      }
    }

    if (!foundShelf) {
      return res.status(404).json({ message: '货架不存在' });
    }

    const itemIndex = foundShelf.items.findIndex(i => i._id.toString() === req.params.itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: '物品不存在' });
    }

    foundShelf.items.splice(itemIndex, 1);
    foundShelf.updatedAt = new Date();
    await shop.save();

    res.json({
      success: true,
      message: '物品已从货架移除'
    });
  } catch (error) {
    console.error('从货架移除物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 赞助签约管理 API ====================

// @route   POST /api/shops/:id/signing/sponsor
// @desc    签约赞助商
// @access  Private (owner/operator)
router.post('/:id/signing/sponsor', protect, abac({ resource: 'shop', actions: ['write'] }), [
  body('name').notEmpty().withMessage('赞助商名称是必填项')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, logo, contactPerson, contactPhone, contactEmail, sponsorshipAmount, sponsorshipType, contractStart, contractEnd, benefits, notes } = req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isOperator && !isAdmin) {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以签约赞助商' });
    }

    // 添加赞助商
    if (!shop.sponsors) {
      shop.sponsors = [];
    }

    const newSponsor = {
      name,
      logo: logo || '',
      contactPerson: contactPerson || '',
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || '',
      sponsorshipAmount: sponsorshipAmount || 0,
      sponsorshipType: sponsorshipType || 'cash',
      contractStart: contractStart || new Date(),
      contractEnd: contractEnd || null,
      status: 'active',
      benefits: benefits || '',
      notes: notes || '',
      signedDate: new Date()
    };

    shop.sponsors.push(newSponsor);

    // 更新签约统计
    if (!shop.signingStats) {
      shop.signingStats = {};
    }
    shop.signingStats.totalSponsorshipRevenue = (shop.signingStats.totalSponsorshipRevenue || 0) + (sponsorshipAmount || 0);
    shop.signingStats.activeSponsorCount = shop.sponsors.filter(s => s.status === 'active').length;

    // 添加签约记录
    if (!shop.signingRecords) {
      shop.signingRecords = [];
    }
    shop.signingRecords.push({
      type: 'sponsor',
      targetId: shop.sponsors[shop.sponsors.length - 1]._id,
      targetName: name,
      action: 'sign',
      amount: sponsorshipAmount || 0,
      date: new Date(),
      operator: req.user._id,
      notes: notes || ''
    });

    await shop.save();

    res.status(201).json({
      success: true,
      message: '赞助商签约成功',
      data: shop.sponsors[shop.sponsors.length - 1]
    });
  } catch (error) {
    console.error('签约赞助商错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:id/signing/sponsors
// @desc    获取赞助商列表
// @access  Private (店员)
router.get('/:id/signing/sponsors', protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店员
    const isEmployee = shop.employees.some(e => e.user.toString() === req.user._id.toString());
    const isOwner = shop.owner.toString() === req.user._id.toString();

    if (!isEmployee && !isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '只有店铺员工可以查看赞助商列表' });
    }

    res.json({
      success: true,
      data: shop.sponsors || []
    });
  } catch (error) {
    console.error('获取赞助商列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/shops/:id/signing/sponsors/:sponsorId
// @desc    更新赞助商信息
// @access  Private (owner/operator)
router.put('/:id/signing/sponsors/:sponsorId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { name, logo, contactPerson, contactPhone, contactEmail, sponsorshipAmount, sponsorshipType, contractStart, contractEnd, status, benefits, notes } = req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isOperator && !isAdmin) {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以更新赞助商信息' });
    }

    const sponsor = shop.sponsors?.find(s => s._id.toString() === req.params.sponsorId);
    if (!sponsor) {
      return res.status(404).json({ message: '赞助商不存在' });
    }

    // 计算赞助金额变化
    const oldAmount = sponsor.sponsorshipAmount || 0;
    const newAmount = sponsorshipAmount !== undefined ? sponsorshipAmount : oldAmount;
    const amountDifference = newAmount - oldAmount;

    // 更新字段
    if (name !== undefined) sponsor.name = name;
    if (logo !== undefined) sponsor.logo = logo;
    if (contactPerson !== undefined) sponsor.contactPerson = contactPerson;
    if (contactPhone !== undefined) sponsor.contactPhone = contactPhone;
    if (contactEmail !== undefined) sponsor.contactEmail = contactEmail;
    if (sponsorshipAmount !== undefined) sponsor.sponsorshipAmount = sponsorshipAmount;
    if (sponsorshipType !== undefined) sponsor.sponsorshipType = sponsorshipType;
    if (contractStart !== undefined) sponsor.contractStart = contractStart;
    if (contractEnd !== undefined) sponsor.contractEnd = contractEnd;
    if (status !== undefined) sponsor.status = status;
    if (benefits !== undefined) sponsor.benefits = benefits;
    if (notes !== undefined) sponsor.notes = notes;

    // 更新签约统计
    if (amountDifference !== 0) {
      shop.signingStats.totalSponsorshipRevenue = (shop.signingStats.totalSponsorshipRevenue || 0) + amountDifference;
    }
    shop.signingStats.activeSponsorCount = shop.sponsors.filter(s => s.status === 'active').length;

    // 添加签约记录
    shop.signingRecords.push({
      type: 'sponsor',
      targetId: sponsor._id,
      targetName: sponsor.name,
      action: status === 'terminated' ? 'terminate' : (status === 'expired' ? 'expire' : 'renew'),
      amount: amountDifference,
      date: new Date(),
      operator: req.user._id,
      notes: notes || ''
    });

    await shop.save();

    res.json({
      success: true,
      message: '赞助商信息已更新',
      data: sponsor
    });
  } catch (error) {
    console.error('更新赞助商错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/shops/:id/signing/sponsors/:sponsorId
// @desc    解除赞助商
// @access  Private (owner/operator)
router.delete('/:id/signing/sponsors/:sponsorId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { reason } = req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isOperator && !isAdmin) {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以解除赞助' });
    }

    const sponsorIndex = shop.sponsors?.findIndex(s => s._id.toString() === req.params.sponsorId);
    if (sponsorIndex === -1 || sponsorIndex === undefined) {
      return res.status(404).json({ message: '赞助商不存在' });
    }

    const removedSponsor = shop.sponsors[sponsorIndex];

    // 添加签约记录
    shop.signingRecords.push({
      type: 'sponsor',
      targetId: removedSponsor._id,
      targetName: removedSponsor.name,
      action: 'terminate',
      amount: 0,
      date: new Date(),
      operator: req.user._id,
      notes: reason || '解除赞助'
    });

    // 更新签约统计
    shop.signingStats.activeSponsorCount = shop.sponsors.filter(s => s.status === 'active' && s._id.toString() !== req.params.sponsorId).length;

    // 移除赞助商
    shop.sponsors.splice(sponsorIndex, 1);

    await shop.save();

    res.json({
      success: true,
      message: '已解除赞助'
    });
  } catch (error) {
    console.error('解除赞助商错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 战队签约管理 API ====================

// @route   POST /api/shops/:id/signing/team
// @desc    签约战队
// @access  Private (owner/operator)
router.post('/:id/signing/team', protect, abac({ resource: 'shop', actions: ['write'] }), [
  body('teamId').notEmpty().withMessage('战队ID是必填项'),
  body('sponsorshipAmount').optional().isInt({ min: 0 }).withMessage('赞助金额必须是正数')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId, sponsorshipAmount, sponsorshipType, contractStart, contractEnd, benefits, notes } = req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isOperator && !isAdmin) {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以签约战队' });
    }

    // 检查战队是否存在
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否已经签约了这个战队
    const existingSignedTeam = shop.signedTeams?.find(st => st.team.toString() === teamId);
    if (existingSignedTeam) {
      return res.status(400).json({ message: '这个战队已经签约了' });
    }

    // 添加签约战队
    if (!shop.signedTeams) {
      shop.signedTeams = [];
    }

    const newSignedTeam = {
      team: teamId,
      sponsorshipAmount: sponsorshipAmount || 0,
      sponsorshipType: sponsorshipType || 'cash',
      contractStart: contractStart || new Date(),
      contractEnd: contractEnd || null,
      status: 'active',
      benefits: benefits || '',
      notes: notes || '',
      signedDate: new Date()
    };

    shop.signedTeams.push(newSignedTeam);

    // 更新签约统计
    if (!shop.signingStats) {
      shop.signingStats = {};
    }
    shop.signingStats.totalSponsorshipRevenue = (shop.signingStats.totalSponsorshipRevenue || 0) + (sponsorshipAmount || 0);
    shop.signingStats.activeTeamCount = shop.signedTeams.filter(st => st.status === 'active').length;

    // 添加签约记录
    if (!shop.signingRecords) {
      shop.signingRecords = [];
    }
    shop.signingRecords.push({
      type: 'team',
      targetId: teamId,
      targetName: team.name,
      action: 'sign',
      amount: sponsorshipAmount || 0,
      date: new Date(),
      operator: req.user._id,
      notes: notes || ''
    });

    await shop.save();

    // 填充战队信息返回
    const lastSignedTeam = shop.signedTeams[shop.signedTeams.length - 1];
    const result = {
      ...lastSignedTeam.toObject(),
      teamInfo: {
        _id: team._id,
        name: team.name,
        description: team.description
      }
    };

    res.status(201).json({
      success: true,
      message: '战队签约成功',
      data: result
    });
  } catch (error) {
    console.error('签约战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:id/signing/teams
// @desc    获取签约战队列表
// @access  Private (店员)
router.get('/:id/signing/teams', protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店铺成员
    const isEmployee = shop.employees.some(e => e.user.toString() === req.user._id.toString());
    const isOwner = shop.owner.toString() === req.user._id.toString();

    if (!isEmployee && !isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '只有店铺员工可以查看签约战队' });
    }

    // 填充战队信息
    const enrichedTeams = await Promise.all(
      (shop.signedTeams || []).map(async (signedTeam) => {
        try {
          const team = await Team.findById(signedTeam.team).select('_id name description logo');
          return {
            ...signedTeam.toObject(),
            teamInfo: team ? {
              _id: team._id,
              name: team.name,
              description: team.description,
              logo: team.logo
            } : null
          };
        } catch (err) {
          return signedTeam;
        }
      })
    );

    res.json({
      success: true,
      data: enrichedTeams
    });
  } catch (error) {
    console.error('获取签约战队列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/shops/:id/signing/teams/:teamId
// @desc    更新签约战队信息
// @access  Private (owner/operator)
router.put('/:id/signing/teams/:teamId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { sponsorshipAmount, sponsorshipType, contractStart, contractEnd, status, benefits, notes } = req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isOperator && !isAdmin) {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以更新签约信息' });
    }

    const signedTeam = shop.signedTeams?.find(st => st.team.toString() === req.params.teamId);
    if (!signedTeam) {
      return res.status(404).json({ message: '签约战队不存在' });
    }

    // 计算赞助金额变化
    const oldAmount = signedTeam.sponsorshipAmount || 0;
    const newAmount = sponsorshipAmount !== undefined ? sponsorshipAmount : oldAmount;
    const amountDifference = newAmount - oldAmount;

    // 更新字段
    if (sponsorshipAmount !== undefined) signedTeam.sponsorshipAmount = sponsorshipAmount;
    if (sponsorshipType !== undefined) signedTeam.sponsorshipType = sponsorshipType;
    if (contractStart !== undefined) signedTeam.contractStart = contractStart;
    if (contractEnd !== undefined) signedTeam.contractEnd = contractEnd;
    if (status !== undefined) signedTeam.status = status;
    if (benefits !== undefined) signedTeam.benefits = benefits;
    if (notes !== undefined) signedTeam.notes = notes;

    // 更新签约统计
    if (amountDifference !== 0) {
      shop.signingStats.totalSponsorshipRevenue = (shop.signingStats.totalSponsorshipRevenue || 0) + amountDifference;
    }
    shop.signingStats.activeTeamCount = shop.signedTeams.filter(st => st.status === 'active').length;

    // 添加签约记录
    const team = await Team.findById(req.params.teamId).select('name');
    shop.signingRecords.push({
      type: 'team',
      targetId: req.params.teamId,
      targetName: team ? team.name : '未知战队',
      action: status === 'terminated' ? 'terminate' : (status === 'expired' ? 'expire' : 'renew'),
      amount: amountDifference,
      date: new Date(),
      operator: req.user._id,
      notes: notes || ''
    });

    await shop.save();

    // 填充战队信息返回
    const result = {
      ...signedTeam.toObject(),
      teamInfo: team ? {
        _id: team._id,
        name: team.name
      } : null
    };

    res.json({
      success: true,
      message: '签约战队信息已更新',
      data: result
    });
  } catch (error) {
    console.error('更新签约战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/shops/:id/signing/teams/:teamId
// @desc    解除签约战队
// @access  Private (owner/operator)
router.delete('/:id/signing/teams/:teamId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { reason } = req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isOperator && !isAdmin) {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以解除签约' });
    }

    const signedTeamIndex = shop.signedTeams?.findIndex(st => st.team.toString() === req.params.teamId);
    if (signedTeamIndex === -1 || signedTeamIndex === undefined) {
      return res.status(404).json({ message: '签约战队不存在' });
    }

    const removedTeam = shop.signedTeams[signedTeamIndex];
    const team = await Team.findById(req.params.teamId).select('name');

    // 添加签约记录
    shop.signingRecords.push({
      type: 'team',
      targetId: req.params.teamId,
      targetName: team ? team.name : '未知战队',
      action: 'terminate',
      amount: 0,
      date: new Date(),
      operator: req.user._id,
      notes: reason || '解除签约'
    });

    // 更新签约统计
    shop.signingStats.activeTeamCount = shop.signedTeams.filter(st => st.status === 'active' && st.team.toString() !== req.params.teamId).length;

    // 移除签约战队
    shop.signedTeams.splice(signedTeamIndex, 1);

    await shop.save();

    res.json({
      success: true,
      message: '已解除战队签约'
    });
  } catch (error) {
    console.error('解除签约战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:id/signing/records
// @desc    获取签约记录
// @access  Private (owner/operator)
router.get('/:id/signing/records', protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));

    if (!isOwner && !isOperator && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以查看签约记录' });
    }

    // 填充操作者信息
    const enrichedRecords = await Promise.all(
      (shop.signingRecords || []).map(async (record) => {
        try {
          const operatorUser = await User.findById(record.operator).select('username');
          return {
            ...record.toObject(),
            operatorInfo: operatorUser ? { _id: operatorUser._id, username: operatorUser.username } : null
          };
        } catch (err) {
          return record;
        }
      })
    );

    // 按时间倒序排列
    const sortedRecords = enrichedRecords.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json({
      success: true,
      data: sortedRecords
    });
  } catch (error) {
    console.error('获取签约记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:id/signing/stats
// @desc    获取签约统计
// @access  Private (owner/operator)
router.get('/:id/signing/stats', protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));

    if (!isOwner && !isOperator && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以查看签约统计' });
    }

    res.json({
      success: true,
      data: shop.signingStats || {
        totalSponsorshipRevenue: 0,
        activeSponsorCount: 0,
        activeTeamCount: 0
      }
    });
  } catch (error) {
    console.error('获取签约统计错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==================== 合约管理 API ====================

// @route   POST /api/shops/:id/signing/teams/:teamId/contract
// @desc    上传战队合约文档
// @access  Private (owner/operator)
router.post('/:id/signing/teams/:teamId/contract', protect, abac({ resource: 'shop', actions: ['write'] }), upload.single('contract'), handleUploadError, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isOperator && !isAdmin) {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以上传合约' });
    }

    // 找到签约战队
    const signedTeam = shop.signedTeams?.find(st => st.team.toString() === req.params.teamId);
    if (!signedTeam) {
      return res.status(404).json({ message: '签约战队不存在' });
    }

    if (!req.file) {
      return res.status(400).json({ message: '请上传合约文件' });
    }

    // 更新合约文档路径
    signedTeam.contractDocument = `/uploads/${req.file.filename}`;
    await shop.save();

    res.json({
      success: true,
      message: '合约上传成功',
      data: {
        contractDocument: signedTeam.contractDocument,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('上传合约错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/shops/:id/signing/teams/:teamId/contract
// @desc    删除战队合约文档
// @access  Private (owner/operator)
router.delete('/:id/signing/teams/:teamId/contract', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 检查是否是店主或管理员
    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isOperator = shop.employees.some(e => e.user.toString() === req.user._id.toString() && ['owner', 'operator'].includes(e.role));
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isOperator && !isAdmin) {
      return res.status(403).json({ message: '只有店主、管理员或超级管理员可以删除合约' });
    }

    // 找到签约战队
    const signedTeam = shop.signedTeams?.find(st => st.team.toString() === req.params.teamId);
    if (!signedTeam) {
      return res.status(404).json({ message: '签约战队不存在' });
    }

    // 删除文件
    if (signedTeam.contractDocument) {
      const filePath = path.join(__dirname, '../public', signedTeam.contractDocument);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 清空合约文档路径
    signedTeam.contractDocument = '';
    await shop.save();

    res.json({
      success: true,
      message: '合约删除成功'
    });
  } catch (error) {
    console.error('删除合约错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
