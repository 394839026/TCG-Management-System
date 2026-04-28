const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Team = require('../models/Team');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// @route   POST /api/teams
// @desc    创建战队
// @access  Private (personal用户)
router.post('/', protect, [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('战队名称需要2-50个字符'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述不能超过500个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, logo } = req.body;

    // 检查战队名称是否已存在
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      return res.status(400).json({ message: '战队名称已被使用' });
    }

    const team = new Team({
      name,
      description,
      logo,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'leader',
        permissions: {
          canBorrowCards: true,
          canBorrowDecks: true,
          canManageInventory: true
        }
      }]
    });

    await team.save();

    // 更新用户的teams数组
    await User.findByIdAndUpdate(req.user._id, {
      $push: { teams: team._id }
    });

    res.status(201).json({
      success: true,
      message: '战队创建成功',
      data: team
    });
  } catch (error) {
    console.error('创建战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams
// @desc    获取战队列表(支持搜索/分页)
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

    const teams = await Team.find(filter)
      .populate('owner', 'username avatar')
      .select('-sharedInventory -sharedDecks -investmentRecords')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Team.countDocuments(filter);

    res.json({
      success: true,
      count: teams.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: teams
    });
  } catch (error) {
    console.error('获取战队列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id
// @desc    获取战队详情
// @access  Public (公开战队) / Private (成员)
router.get('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'username avatar email')
      .populate('members.user', 'username avatar')
      .populate('sharedInventory.item')
      .populate('sharedDecks.deck');

    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查访问权限
    if (!team.settings.isPublic) {
      const isMember = team.members.some(m => m.user._id.toString() === req.user._id.toString());
      const isOwner = team.owner._id.toString() === req.user._id.toString();
      
      if (!isMember && !isOwner && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: '您不是该战队成员' });
      }
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('获取战队详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id
// @desc    更新战队信息
// @access  Private (owner/manager with ABAC)
router.put('/:id', protect, abac({ resource: 'team', actions: ['write'] }), async (req, res) => {
  try {
    const { name, description, logo, settings } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 更新字段
    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (logo !== undefined) team.logo = logo;
    if (settings) team.settings = { ...team.settings, ...settings };

    await team.save();

    res.json({
      success: true,
      message: '战队信息更新成功',
      data: team
    });
  } catch (error) {
    console.error('更新战队错误:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '战队名称已被使用' });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/teams/:id
// @desc    解散战队
// @access  Private (仅owner)
router.delete('/:id', protect, abac({ resource: 'team', actions: ['delete'] }), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 移除所有成员的teams引用
    await User.updateMany(
      { _id: { $in: team.members.map(m => m.user) } },
      { $pull: { teams: team._id } }
    );

    await team.deleteOne();

    res.json({
      success: true,
      message: '战队已解散'
    });
  } catch (error) {
    console.error('解散战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/teams/:id/members
// @desc    申请加入战队
// @access  Private
router.post('/:id/members', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否已是成员
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (isMember) {
      return res.status(400).json({ message: '您已经是该战队成员' });
    }

    // 检查是否允许加入
    if (!team.settings.allowJoinRequests) {
      return res.status(400).json({ message: '该战队暂不接受加入申请' });
    }

    // 添加为待审核成员(这里简化处理,直接加入为member)
    team.members.push({
      user: req.user._id,
      role: 'member',
      permissions: {
        canBorrowCards: false,
        canBorrowDecks: false,
        canManageInventory: false
      }
    });

    await team.save();

    // 更新用户的teams数组
    await User.findByIdAndUpdate(req.user._id, {
      $push: { teams: team._id }
    });

    res.status(201).json({
      success: true,
      message: '已成功加入战队',
      data: team
    });
  } catch (error) {
    console.error('加入战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/members/:userId/role
// @desc    修改成员角色
// @access  Private (仅owner)
router.put('/:id/members/:userId/role', protect, abac({ resource: 'team', actions: ['manage'] }), async (req, res) => {
  try {
    const { role } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const member = team.members.find(m => m.user.toString() === req.params.userId);
    if (!member) {
      return res.status(404).json({ message: '成员不存在' });
    }

    member.role = role;
    await team.save();

    res.json({
      success: true,
      message: '成员角色已更新',
      data: team
    });
  } catch (error) {
    console.error('修改成员角色错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/teams/:id/members/:userId
// @desc    移除成员
// @access  Private (owner或self)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const isOwner = team.owner.toString() === req.user._id.toString();
    const isSelf = req.params.userId === req.user._id.toString();

    if (!isOwner && !isSelf) {
      return res.status(403).json({ message: '您没有权限移除该成员' });
    }

    team.members = team.members.filter(m => m.user.toString() !== req.params.userId);
    await team.save();

    // 更新用户的teams数组
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { teams: team._id }
    });

    res.json({
      success: true,
      message: '成员已移除'
    });
  } catch (error) {
    console.error('移除成员错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/members/:userId/permissions
// @desc    设置成员权限
// @access  Private (仅owner)
router.put('/:id/members/:userId/permissions', protect, abac({ resource: 'team', actions: ['manage'] }), async (req, res) => {
  try {
    const { permissions } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const member = team.members.find(m => m.user.toString() === req.params.userId);
    if (!member) {
      return res.status(404).json({ message: '成员不存在' });
    }

    member.permissions = { ...member.permissions, ...permissions };
    await team.save();

    res.json({
      success: true,
      message: '成员权限已更新',
      data: team
    });
  } catch (error) {
    console.error('设置成员权限错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/teams/:id/shared-inventory
// @desc    添加物品到共享库存
// @access  Private (成员with permission)
router.post('/:id/shared-inventory', protect, abac({ resource: 'team', actions: ['write'] }), async (req, res) => {
  try {
    const { itemId } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否已在共享库存中
    const alreadyShared = team.sharedInventory.some(si => si.item.toString() === itemId);
    if (alreadyShared) {
      return res.status(400).json({ message: '该物品已在共享库存中' });
    }

    team.sharedInventory.push({
      item: itemId,
      addedBy: req.user._id,
      isAvailable: true
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: '物品已添加到共享库存',
      data: team
    });
  } catch (error) {
    console.error('添加共享物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/shared-inventory/:itemId/borrow
// @desc    借用物品
// @access  Private (成员with permission)
router.put('/:id/shared-inventory/:itemId/borrow', protect, abac({ resource: 'team', actions: ['write'] }), async (req, res) => {
  try {
    const { returnDate } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const sharedItem = team.sharedInventory.find(si => si._id.toString() === req.params.itemId);
    if (!sharedItem) {
      return res.status(404).json({ message: '共享物品不存在' });
    }

    if (!sharedItem.isAvailable) {
      return res.status(400).json({ message: '该物品已被借出' });
    }

    sharedItem.isAvailable = false;
    sharedItem.borrowedBy = req.user._id;
    sharedItem.borrowedAt = Date.now();
    sharedItem.returnDate = returnDate || null;

    await team.save();

    res.json({
      success: true,
      message: '物品借用成功',
      data: team
    });
  } catch (error) {
    console.error('借用物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/shared-inventory/:itemId/return
// @desc    归还物品
// @access  Private (borrower或owner)
router.put('/:id/shared-inventory/:itemId/return', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const sharedItem = team.sharedInventory.find(si => si._id.toString() === req.params.itemId);
    if (!sharedItem) {
      return res.status(404).json({ message: '共享物品不存在' });
    }

    const isBorrower = sharedItem.borrowedBy.toString() === req.user._id.toString();
    const isOwner = team.owner.toString() === req.user._id.toString();

    if (!isBorrower && !isOwner) {
      return res.status(403).json({ message: '您没有权限归还此物品' });
    }

    sharedItem.isAvailable = true;
    sharedItem.borrowedBy = undefined;
    sharedItem.borrowedAt = undefined;
    sharedItem.returnDate = undefined;

    await team.save();

    res.json({
      success: true,
      message: '物品归还成功',
      data: team
    });
  } catch (error) {
    console.error('归还物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/teams/:id/investments
// @desc    记录投资收支
// @access  Private (owner/manager)
router.post('/:id/investments', protect, abac({ resource: 'team', actions: ['write'] }), [
  body('description').trim().notEmpty().withMessage('描述不能为空'),
  body('amount').isNumeric().withMessage('金额必须是数字'),
  body('type').isIn(['income', 'expense']).withMessage('类型必须是income或expense')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, amount, type, date } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    team.investmentRecords.push({
      description,
      amount,
      type,
      date: date || Date.now(),
      recordedBy: req.user._id
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: '投资记录已添加',
      data: team
    });
  } catch (error) {
    console.error('添加投资记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id/investments
// @desc    获取投资记录
// @access  Private (成员)
router.get('/:id/investments', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是成员
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    const isOwner = team.owner.toString() === req.user._id.toString();

    if (!isMember && !isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    res.json({
      success: true,
      data: team.investmentRecords
    });
  } catch (error) {
    console.error('获取投资记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id/financial-summary
// @desc    获取财务摘要
// @access  Private (owner/manager)
router.get('/:id/financial-summary', protect, abac({ resource: 'team', actions: ['read'] }), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const income = team.investmentRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const expense = team.investmentRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    res.json({
      success: true,
      data: {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        recordCount: team.investmentRecords.length
      }
    });
  } catch (error) {
    console.error('获取财务摘要错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
