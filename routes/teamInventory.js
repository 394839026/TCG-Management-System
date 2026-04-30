const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Team = require('../models/Team');
const InventoryItem = require('../models/Inventory');
const UserInventory = require('../models/UserInventory');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');

// 测试路由 - 确认路由被正确加载
router.get('/test', (req, res) => {
  console.log('✅ team-inventory 路由测试被调用!');
  res.json({ success: true, message: 'team-inventory 路由工作正常!', time: new Date().toISOString() });
});

const checkTeamMember = async (user, teamId) => {
  const team = await Team.findById(teamId);
  if (!team) return { isMember: false, isLeader: false, isManager: false, role: null, team };

  const member = team.members.find(m => m.user.toString() === user._id.toString());
  const isLeader = team.owner.toString() === user._id.toString();
  const isManager = isLeader || member?.role === 'manager' || member?.role === 'admin';

  return {
    isMember: !!member || isLeader,
    isLeader,
    isManager,
    role: member?.role || (isLeader ? 'leader' : null),
    team
  };
};

// 获取战队库存
router.get('/:teamId/inventory', protect, async (req, res) => {
  try {
    console.log('=== 获取战队库存 ===');
    console.log('战队ID:', req.params.teamId);
    const { teamId } = req.params;
    const { search, rarity, itemType } = req.query;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员，无法查看库存' });
    }

    const query = { _id: { $in: team.sharedInventory.map(i => i.item) } };

    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (rarity) {
      query.rarity = rarity;
    }

    if (itemType) {
      query.itemType = itemType;
    }

    const items = await InventoryItem.find(query);

    const enrichedItems = items.map(item => {
      const sharedInfo = team.sharedInventory.find(
        si => si.item.toString() === item._id.toString()
      );
      return {
        ...item.toObject(),
        sharedAt: sharedInfo?.addedAt,
        isAvailable: sharedInfo?.isAvailable,
        borrowedBy: sharedInfo?.borrowedBy,
        borrowedAt: sharedInfo?.borrowedAt,
        returnDate: sharedInfo?.returnDate,
        addedBy: sharedInfo?.addedBy,
        quantity: sharedInfo?.quantity ?? item.quantity
      };
    });

    const stats = {
      totalItems: enrichedItems.length,
      availableItems: enrichedItems.filter(i => i.isAvailable).length,
      borrowedItems: enrichedItems.filter(i => !i.isAvailable).length
    };

    console.log('返回 enrichedItems:', enrichedItems.map(i => ({ _id: i._id, itemName: i.itemName })));
    console.log('统计:', stats);

    res.json({
      success: true,
      data: enrichedItems,
      stats
    });
  } catch (error) {
    console.error('获取战队库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取捐赠申请
router.get('/:teamId/donation-requests', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 筛选申请 - 默认只返回 pending 状态
    let donationRequests = team.donationRequests || [];
    const filterStatus = status || 'pending';
    donationRequests = donationRequests.filter(r => r.status === filterStatus);

    // 获取物品详细信息
    const itemIds = donationRequests.map(r => r.item);
    const items = await InventoryItem.find({ _id: { $in: itemIds } });

    // 获取用户详细信息
    const userIds = donationRequests.map(r => r.addedBy);
    const users = await User.find({ _id: { $in: userIds } });

    // 合并数据
    const enrichedRequests = donationRequests.map(request => {
      const item = items.find(i => i._id.toString() === request.item.toString());
      const addedByUser = users.find(u => u._id.toString() === request.addedBy.toString());
      return {
        _id: request._id,
        item: item ? item.toObject() : null,
        itemId: request.item,
        addedBy: addedByUser ? { _id: addedByUser._id, username: addedByUser.username, email: addedByUser.email } : request.addedBy,
        quantity: request.quantity,
        requestDate: request.requestDate,
        status: request.status,
        handledBy: request.handledBy,
        handledDate: request.handledDate,
        note: request.note
      };
    });

    res.json({
      success: true,
      data: enrichedRequests
    });
  } catch (error) {
    console.error('获取捐赠申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建捐赠申请（扣除用户库存）
router.post('/:teamId/inventory', protect, [
  body('inventoryItemId').notEmpty().withMessage('库存物品ID不能为空'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('数量必须是正整数')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId } = req.params;
    const { inventoryItemId, quantity = 1 } = req.body;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员，无法添加库存' });
    }

    const team = memberCheck.team;

    const inventoryItem = await InventoryItem.findById(inventoryItemId);
    if (!inventoryItem) {
      return res.status(404).json({ message: '库存物品不存在' });
    }

    // 获取用户的库存记录
    const UserInventory = require('../models/UserInventory');
    const userInventoryItem = await UserInventory.findOne({
      userId: req.user._id,
      inventoryItemId: inventoryItemId
    });

    if (!userInventoryItem || userInventoryItem.quantity <= 0) {
      return res.status(403).json({ message: '您没有该物品的库存' });
    }

    // 检查数量是否足够
    if (quantity < 1) {
      return res.status(400).json({ message: '捐赠数量必须大于0' });
    }
    if (quantity > userInventoryItem.quantity) {
      return res.status(400).json({ 
        message: `库存不足！您只有 ${userInventoryItem.quantity} 个，无法捐赠 ${quantity} 个` 
      });
    }

    // 检查是否有相同的待处理申请
    const existingPendingRequest = team.donationRequests?.find(r => 
      r.item.toString() === inventoryItemId && r.status === 'pending'
    );
    if (existingPendingRequest) {
      return res.status(400).json({ message: '该物品已有待处理的捐赠申请' });
    }

    // 检查物品是否已在战队库存中
    const alreadyInInventory = team.sharedInventory?.some(
      si => si.item.toString() === inventoryItemId
    );
    if (alreadyInInventory) {
      return res.status(400).json({ message: '该物品已在战队库存中' });
    }

    // 扣除用户库存（修改UserInventory，而不是InventoryItem）
    userInventoryItem.quantity -= quantity;
    await userInventoryItem.save();

    // 创建捐赠申请
    if (!team.donationRequests) {
      team.donationRequests = [];
    }
    team.donationRequests.push({
      item: inventoryItemId,
      addedBy: req.user._id,
      quantity: quantity,
      status: 'pending'
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: '捐赠申请已提交，等待队长审批'
    });
  } catch (error) {
    console.error('添加战队库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 撤回捐赠申请（仅捐赠者本人）
router.delete('/:teamId/donation-requests/:requestId', protect, async (req, res) => {
  try {
    const { teamId, requestId } = req.params;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = memberCheck.team;
    const requestIndex = team.donationRequests?.findIndex(r => r._id.toString() === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: '捐赠申请不存在' });
    }

    const donationRequest = team.donationRequests[requestIndex];

    // 检查是否是捐赠者本人
    if (donationRequest.addedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '只有捐赠者本人可以撤回申请' });
    }

    // 检查申请状态是否是待处理
    if (donationRequest.status !== 'pending') {
      return res.status(400).json({ message: '该申请已被处理，无法撤回' });
    }

    // 退回用户库存
    const UserInventory = require('../models/UserInventory');
    let userInventoryItem = await UserInventory.findOne({
      userId: donationRequest.addedBy,
      inventoryItemId: donationRequest.item
    });

    if (!userInventoryItem) {
      // 如果用户没有这个物品记录，创建一个
      userInventoryItem = await UserInventory.create({
        userId: donationRequest.addedBy,
        inventoryItemId: donationRequest.item,
        quantity: donationRequest.quantity
      });
    } else {
      userInventoryItem.quantity += donationRequest.quantity;
      await userInventoryItem.save();
    }

    // 移除捐赠申请
    team.donationRequests.splice(requestIndex, 1);
    await team.save();

    res.json({
      success: true,
      message: '捐赠申请已撤回，物品已退回'
    });
  } catch (error) {
    console.error('撤回捐赠申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 处理捐赠申请（批准或拒绝）
router.post('/:teamId/donation-requests/:requestId/handle', protect, async (req, res) => {
  try {
    const { teamId, requestId } = req.params;
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '无效的操作' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isLeader && !memberCheck.isManager) {
      return res.status(403).json({ message: '只有队长或管理员可以处理捐赠申请' });
    }

    const team = memberCheck.team;
    const requestIndex = team.donationRequests?.findIndex(r => r._id.toString() === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: '捐赠申请不存在' });
    }

    const donationRequest = team.donationRequests[requestIndex];

    if (donationRequest.status !== 'pending') {
      return res.status(400).json({ message: '该申请已被处理过了' });
    }

    if (action === 'approve') {
      // 批准：添加到战队库存
      team.sharedInventory.push({
        item: donationRequest.item,
        addedBy: donationRequest.addedBy,
        isAvailable: true,
        quantity: donationRequest.quantity
      });

      // 获取物品信息并添加到捐赠记录
      const item = await InventoryItem.findById(donationRequest.item);
      
      // 添加物品捐赠记录
      if (!team.donationRecords) {
        team.donationRecords = [];
      }
      team.donationRecords.push({
        type: 'item',
        donor: donationRequest.addedBy,
        item: donationRequest.item,
        itemName: item?.itemName || '未知物品',
        quantity: donationRequest.quantity,
        donatedAt: new Date()
      });

      donationRequest.status = 'approved';
      donationRequest.handledBy = req.user._id;
      donationRequest.handledDate = new Date();

    } else {
      // 拒绝：退回用户库存（使用UserInventory）
      let userInventoryItem = await UserInventory.findOne({
        userId: donationRequest.addedBy,
        inventoryItemId: donationRequest.item
      });

      if (!userInventoryItem) {
        // 如果用户没有这个物品记录，创建一个
        userInventoryItem = await UserInventory.create({
          userId: donationRequest.addedBy,
          inventoryItemId: donationRequest.item,
          quantity: donationRequest.quantity
        });
      } else {
        userInventoryItem.quantity += donationRequest.quantity;
        await userInventoryItem.save();
      }

      donationRequest.status = 'rejected';
      donationRequest.handledBy = req.user._id;
      donationRequest.handledDate = new Date();
    }

    await team.save();

    res.json({
      success: true,
      message: action === 'approve' ? '捐赠已批准，物品已入库' : '捐赠已拒绝，物品已退回'
    });
  } catch (error) {
    console.error('处理捐赠申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除战队库存
router.delete('/:teamId/inventory/:itemId', protect, async (req, res) => {
  try {
    const { teamId, itemId } = req.params;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    if (!memberCheck.isLeader && memberCheck.role !== 'manager') {
      return res.status(403).json({ message: '只有队长或管理员可以移除库存' });
    }

    const team = memberCheck.team;

    const sharedItemIndex = team.sharedInventory?.findIndex(
      si => si.item.toString() === itemId
    );
    if (sharedItemIndex === -1) {
      return res.status(404).json({ message: '该物品不在战队库存中' });
    }

    // 从战队库存移除，不退还给原捐赠者（捐赠已完成，物品属于战队）
    team.sharedInventory.splice(sharedItemIndex, 1);

    await team.save();

    res.json({
      success: true,
      message: '物品已从战队库存移除'
    });
  } catch (error) {
    console.error('移除战队库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 借用物品
router.put('/:teamId/inventory/:itemId/borrow', protect, async (req, res) => {
  try {
    const { teamId, itemId } = req.params;
    const { returnDate } = req.body;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员，无法借用物品' });
    }

    const team = memberCheck.team;

    const sharedItem = team.sharedInventory?.find(
      si => si.item.toString() === itemId
    );
    if (!sharedItem) {
      return res.status(404).json({ message: '该物品不在战队库存中' });
    }

    if (!sharedItem.isAvailable) {
      return res.status(400).json({ message: '该物品已被其他成员借用' });
    }

    // 移除了"不能借用自己添加的物品"的限制，现在可以借用任何可用的物品

    sharedItem.isAvailable = false;
    sharedItem.borrowedBy = req.user._id;
    sharedItem.borrowedAt = new Date();
    sharedItem.returnDate = returnDate ? new Date(returnDate) : null;

    await team.save();

    res.json({
      success: true,
      message: '物品借用成功'
    });
  } catch (error) {
    console.error('借用物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 归还物品
router.put('/:teamId/inventory/:itemId/return', protect, async (req, res) => {
  try {
    const { teamId, itemId } = req.params;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = memberCheck.team;

    const sharedItem = team.sharedInventory?.find(
      si => si.item.toString() === itemId
    );
    if (!sharedItem) {
      return res.status(404).json({ message: '该物品不在战队库存中' });
    }

    if (sharedItem.borrowedBy?.toString() !== req.user._id.toString() &&
        !memberCheck.isLeader &&
        memberCheck.role !== 'manager') {
      return res.status(403).json({ message: '只有借用人或管理员可以归还此物品' });
    }

    sharedItem.isAvailable = true;
    sharedItem.borrowedBy = null;
    sharedItem.borrowedAt = null;
    sharedItem.returnDate = null;

    await team.save();

    res.json({
      success: true,
      message: '物品已归还'
    });
  } catch (error) {
    console.error('归还物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取我的借用记录
router.get('/:teamId/inventory/my-borrows', protect, async (req, res) => {
  try {
    const { teamId } = req.params;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = await Team.findById(teamId);

    const myBorrows = team.sharedInventory.filter(
      si => si.borrowedBy?.toString() === req.user._id.toString()
    );

    const items = await InventoryItem.find({
      _id: { $in: myBorrows.map(b => b.item) }
    });

    const enrichedItems = items.map(item => {
      const sharedInfo = myBorrows.find(
        si => si.item.toString() === item._id.toString()
      );
      return {
        ...item.toObject(),
        borrowedAt: sharedInfo?.borrowedAt,
        returnDate: sharedInfo?.returnDate
      };
    });

    res.json({
      success: true,
      data: enrichedItems
    });
  } catch (error) {
    console.error('获取借用记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建借用申请
router.post('/:teamId/borrow-requests', protect, [
  body('inventoryItemId').notEmpty().withMessage('物品ID不能为空'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('数量必须至少为1')
], async (req, res) => {
  try {
    console.log('=== 创建借用请求 ===');
    console.log('请求参数:', req.body);
    console.log('战队ID:', req.params.teamId);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('验证错误:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId } = req.params;
    const { inventoryItemId, quantity = 1, note, returnDate } = req.body;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      console.log('用户不是战队成员');
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = memberCheck.team;
    console.log('战队共享库存:', team.sharedInventory?.map(si => ({ item: si.item.toString(), isAvailable: si.isAvailable })));
    console.log('提交的物品ID:', inventoryItemId);

    // 检查物品是否在战队共享库存中且可用
    const sharedItem = team.sharedInventory?.find(
      si => si.item.toString() === inventoryItemId && si.isAvailable
    );
    console.log('找到的共享物品:', sharedItem);
    
    if (!sharedItem) {
      console.log('物品不在库存中或不可用');
      return res.status(400).json({ message: '该物品不在战队库存中或已被借出' });
    }

    // 检查数量是否足够
    if (quantity > sharedItem.quantity) {
      console.log('数量不足');
      return res.status(400).json({ message: `库存不足，当前可用数量: ${sharedItem.quantity}` });
    }

    // 获取物品信息
    const item = await InventoryItem.findById(inventoryItemId);
    console.log('找到的物品:', item);
    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    // 创建借用申请
    if (!team.borrowRequests) {
      team.borrowRequests = [];
    }
    team.borrowRequests.push({
      item: inventoryItemId,
      itemName: item.itemName,
      quantity,
      requestedBy: req.user._id,
      requestDate: new Date(),
      status: 'pending',
      returnDate: returnDate ? new Date(returnDate) : undefined,
      note: note || ''
    });

    await team.save();

    // 发送通知给队长
    if (team.owner.toString() !== req.user._id.toString()) {
      const Notification = require('../models/Notification');
      const notification = new Notification({
        recipient: team.owner,
        type: 'system',
        title: '新的借用申请',
        content: `${req.user.username} 申请借用 ${item.itemName} x${quantity}`,
        relatedId: team._id,
      });
      await notification.save();
    }

    res.status(201).json({
      success: true,
      message: '借用申请已提交，等待队长批准'
    });
  } catch (error) {
    console.error('创建借用申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取借用申请列表
router.get('/:teamId/borrow-requests', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 筛选申请 - 默认只返回 pending 状态
    let borrowRequests = team.borrowRequests || [];
    const filterStatus = status || 'pending';
    if (filterStatus !== 'all') {
      borrowRequests = borrowRequests.filter(r => r.status === filterStatus);
    }

    // 获取物品详细信息
    const itemIds = borrowRequests.map(r => r.item);
    const items = await InventoryItem.find({ _id: { $in: itemIds } });

    // 获取用户详细信息
    const userIds = [...new Set([
      ...borrowRequests.map(r => r.requestedBy.toString()),
      ...borrowRequests.filter(r => r.handledBy).map(r => r.handledBy.toString())
    ])];
    const users = await User.find({ _id: { $in: userIds } });

    // 合并数据
    const enrichedRequests = borrowRequests.map(request => {
      const item = items.find(i => i._id.toString() === request.item.toString());
      const requestedByUser = users.find(u => u._id.toString() === request.requestedBy.toString());
      const handledByUser = request.handledBy ? users.find(u => u._id.toString() === request.handledBy.toString()) : null;
      return {
        _id: request._id,
        item: item ? item.toObject() : null,
        itemName: request.itemName || item?.itemName || '未知物品',
        quantity: request.quantity,
        requestedBy: requestedByUser ? { _id: requestedByUser._id, username: requestedByUser.username, email: requestedByUser.email } : request.requestedBy,
        requestDate: request.requestDate,
        status: request.status,
        handledBy: handledByUser ? { _id: handledByUser._id, username: handledByUser.username } : request.handledBy,
        handledDate: request.handledDate,
        returnDate: request.returnDate,
        note: request.note
      };
    });

    // 按时间倒序排列
    enrichedRequests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    res.json({
      success: true,
      data: enrichedRequests
    });
  } catch (error) {
    console.error('获取借用申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 处理借用申请（批准或拒绝）
router.post('/:teamId/borrow-requests/:requestId/handle', protect, async (req, res) => {
  try {
    console.log('=== 处理借用申请 ===');
    console.log('战队ID:', req.params.teamId);
    console.log('申请ID:', req.params.requestId);
    console.log('操作:', req.body.action);
    
    const { teamId, requestId } = req.params;
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '无效的操作' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isManager) {
      return res.status(403).json({ message: '只有队长或管理员可以处理借用申请' });
    }

    const team = memberCheck.team;
    console.log('所有借用申请:', team.borrowRequests?.map(r => ({ _id: r._id.toString(), status: r.status })));
    const requestIndex = team.borrowRequests?.findIndex(r => r._id.toString() === requestId);
    
    console.log('找到的申请索引:', requestIndex);
    if (requestIndex === -1) {
      return res.status(404).json({ message: '借用申请不存在' });
    }

    const borrowRequest = team.borrowRequests[requestIndex];
    console.log('找到的借用申请:', borrowRequest);

    if (borrowRequest.status !== 'pending') {
      return res.status(400).json({ message: '该申请已被处理过了' });
    }

    if (action === 'approve') {
      // 批准：更新共享库存状态
      const sharedItem = team.sharedInventory?.find(
        si => si.item.toString() === borrowRequest.item.toString() && si.isAvailable
      );
      
      if (!sharedItem) {
        return res.status(400).json({ message: '该物品已不可用' });
      }

      // 检查数量
      if (borrowRequest.quantity > sharedItem.quantity) {
        return res.status(400).json({ message: '库存不足' });
      }

      // 如果全部借出，标记为不可用
      if (borrowRequest.quantity === sharedItem.quantity) {
        sharedItem.isAvailable = false;
        sharedItem.borrowedBy = borrowRequest.requestedBy;
        sharedItem.borrowedAt = new Date();
        sharedItem.returnDate = borrowRequest.returnDate;
      } else {
        // 部分借出，减少数量
        sharedItem.quantity -= borrowRequest.quantity;
      }

      // 添加借用记录
      if (!team.borrowRecords) {
        team.borrowRecords = [];
      }
      team.borrowRecords.push({
        item: borrowRequest.item,
        itemName: borrowRequest.itemName,
        quantity: borrowRequest.quantity,
        borrowedBy: borrowRequest.requestedBy,
        borrowedAt: new Date(),
        returnDate: borrowRequest.returnDate,
        status: 'borrowed',
        note: borrowRequest.note
      });

      borrowRequest.status = 'approved';
      borrowRequest.handledBy = req.user._id;
      borrowRequest.handledDate = new Date();

      // 发送通知给申请人
      if (borrowRequest.requestedBy.toString() !== req.user._id.toString()) {
        const Notification = require('../models/Notification');
        const notification = new Notification({
          recipient: borrowRequest.requestedBy,
          type: 'system',
          title: '借用申请已批准',
          content: `您的借用申请 (${borrowRequest.itemName}) 已被批准`,
          relatedId: team._id,
        });
        await notification.save();
      }

    } else {
      // 拒绝：只更新申请状态
      borrowRequest.status = 'rejected';
      borrowRequest.handledBy = req.user._id;
      borrowRequest.handledDate = new Date();

      // 发送通知给申请人
      if (borrowRequest.requestedBy.toString() !== req.user._id.toString()) {
        const Notification = require('../models/Notification');
        const notification = new Notification({
          recipient: borrowRequest.requestedBy,
          type: 'system',
          title: '借用申请已拒绝',
          content: `您的借用申请 (${borrowRequest.itemName}) 已被拒绝`,
          relatedId: team._id,
        });
        await notification.save();
      }
    }

    await team.save();

    res.json({
      success: true,
      message: action === 'approve' ? '借用已批准，物品已借出' : '借用已拒绝'
    });
  } catch (error) {
    console.error('处理借用申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取借用记录
router.get('/:teamId/borrow-records', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 筛选记录
    let borrowRecords = team.borrowRecords || [];
    if (status && status !== 'all') {
      borrowRecords = borrowRecords.filter(r => r.status === status);
    }

    // 获取物品详细信息
    const itemIds = borrowRecords.map(r => r.item);
    const items = await InventoryItem.find({ _id: { $in: itemIds } });

    // 获取用户详细信息
    const userIds = borrowRecords.map(r => r.borrowedBy.toString());
    const users = await User.find({ _id: { $in: userIds } });

    // 合并数据
    const enrichedRecords = borrowRecords.map(record => {
      const item = items.find(i => i._id.toString() === record.item.toString());
      const borrowedByUser = users.find(u => u._id.toString() === record.borrowedBy.toString());
      return {
        _id: record._id,
        item: item ? item.toObject() : null,
        itemName: record.itemName || item?.itemName || '未知物品',
        quantity: record.quantity,
        borrowedBy: borrowedByUser ? { _id: borrowedByUser._id, username: borrowedByUser.username, email: borrowedByUser.email } : record.borrowedBy,
        borrowedAt: record.borrowedAt,
        returnedAt: record.returnedAt,
        returnDate: record.returnDate,
        status: record.status,
        note: record.note
      };
    });

    // 按时间倒序排列
    enrichedRecords.sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));

    res.json({
      success: true,
      data: enrichedRecords
    });
  } catch (error) {
    console.error('获取借用记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 归还物品
router.post('/:teamId/borrow-records/:recordId/return', protect, async (req, res) => {
  try {
    const { teamId, recordId } = req.params;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = memberCheck.team;
    const recordIndex = team.borrowRecords?.findIndex(r => r._id.toString() === recordId);
    
    if (recordIndex === -1) {
      return res.status(404).json({ message: '借用记录不存在' });
    }

    const borrowRecord = team.borrowRecords[recordIndex];

    if (borrowRecord.status !== 'borrowed') {
      return res.status(400).json({ message: '该物品已归还' });
    }

    // 检查权限：只有借用人、队长或管理员可以归还
    const isOwner = borrowRecord.borrowedBy.toString() === req.user._id.toString();
    if (!isOwner && !memberCheck.isManager) {
      return res.status(403).json({ message: '只有借用人、队长或管理员可以归还物品' });
    }

    // 更新借用记录
    borrowRecord.status = 'returned';
    borrowRecord.returnedAt = new Date();

    // 恢复共享库存
    const sharedItem = team.sharedInventory?.find(
      si => si.item.toString() === borrowRecord.item.toString()
    );

    if (sharedItem) {
      if (!sharedItem.isAvailable && sharedItem.borrowedBy?.toString() === borrowRecord.borrowedBy.toString()) {
        // 如果之前被完全借出，恢复可用状态
        sharedItem.isAvailable = true;
        sharedItem.borrowedBy = undefined;
        sharedItem.borrowedAt = undefined;
        sharedItem.returnDate = undefined;
      } else {
        // 恢复数量
        sharedItem.quantity += borrowRecord.quantity;
      }
    }

    await team.save();

    res.json({
      success: true,
      message: '物品已成功归还'
    });
  } catch (error) {
    console.error('归还物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
