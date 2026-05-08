const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const InventoryViewRequest = require('../models/InventoryViewRequest');
const Inventory = require('../models/Inventory');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');

// @route   GET /api/inventory-view-requests/me/received
// @desc    获取我收到的查看库存申请
// @access  Private
router.get('/me/received', protect, async (req, res) => {
  try {
    const requests = await InventoryViewRequest.find({
      owner: req.user._id,
    })
      .populate('requester', 'username avatar email')
      .sort({ createdAt: -1 });

    // 检查过期状态
    const processedRequests = requests.map(r => {
      const obj = r.toObject();
      if (obj.status === 'pending' && r.isExpired()) {
        obj.status = 'expired';
      }
      return obj;
    });

    res.json({
      success: true,
      count: processedRequests.length,
      data: processedRequests
    });
  } catch (error) {
    console.error('获取收到的查看库存申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/inventory-view-requests/me/sent
// @desc    获取我发送的查看库存申请
// @access  Private
router.get('/me/sent', protect, async (req, res) => {
  try {
    const requests = await InventoryViewRequest.find({
      requester: req.user._id,
    })
      .populate('owner', 'username avatar email')
      .sort({ createdAt: -1 });

    // 检查过期状态
    const processedRequests = requests.map(r => {
      const obj = r.toObject();
      if (obj.status === 'pending' && r.isExpired()) {
        obj.status = 'expired';
      }
      return obj;
    });

    res.json({
      success: true,
      count: processedRequests.length,
      data: processedRequests
    });
  } catch (error) {
    console.error('获取发送的查看库存申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/inventory-view-requests
// @desc    发送查看库存申请
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({ message: '用户ID不能为空' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: '不能申请查看自己的库存' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查是否已经是好友（可选，或者允许任何人申请）
    // 如果要限制为好友，取消下面的注释
    /*
    const isFriend = await Friendship.findOne({
      $or: [
        { requester: req.user._id, addressee: userId, status: 'accepted' },
        { requester: userId, addressee: req.user._id, status: 'accepted' }
      ]
    });
    
    if (!isFriend) {
      return res.status(400).json({ message: '只能向好友申请查看库存' });
    }
    */

    // 检查是否已经有未处理的申请
    const existingRequest = await InventoryViewRequest.findOne({
      requester: req.user._id,
      owner: userId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: '您已经发送过申请，请等待对方回复' });
    }

    // 检查是否已经有有效权限
    const activePermission = await InventoryViewRequest.findOne({
      requester: req.user._id,
      owner: userId,
      status: 'accepted'
    });

    if (activePermission && !activePermission.isExpired()) {
      return res.status(400).json({ message: '您已经有权限查看该用户的库存' });
    }

    const request = new InventoryViewRequest({
      requester: req.user._id,
      owner: userId,
      message: message || ''
    });

    await request.save();

    // 发送通知给库存所有者
    const notification = new Notification({
      recipient: userId,
      type: 'inventory_view_request',
      title: '库存查看申请',
      content: `${req.user.username} 申请查看您的库存${message ? `，留言：${message}` : ''}`,
      data: {
        requesterId: req.user._id,
        requesterUsername: req.user.username,
        requestId: request._id
      }
    });

    await notification.save();

    const populatedRequest = await InventoryViewRequest.findById(request._id)
      .populate('owner', 'username avatar email');

    res.status(201).json({
      success: true,
      message: '查看库存申请已发送',
      data: populatedRequest
    });
  } catch (error) {
    console.error('发送查看库存申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/inventory-view-requests/:requestId/accept
// @desc    接受查看库存申请
// @access  Private
router.put('/:requestId/accept', protect, async (req, res) => {
  try {
    const request = await InventoryViewRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: '申请不存在' });
    }

    if (request.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '没有权限' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: '该申请已被处理' });
    }

    if (request.isExpired()) {
      return res.status(400).json({ message: '该申请已过期' });
    }

    request.status = 'accepted';
    await request.save();

    // 发送通知给申请者
    const notification = new Notification({
      recipient: request.requester,
      type: 'inventory_view_accepted',
      title: '库存查看申请已接受',
      content: `${req.user.username} 已接受您的库存查看申请`,
      data: {
        ownerId: req.user._id,
        ownerUsername: req.user.username,
        requestId: request._id
      }
    });

    await notification.save();

    const populatedRequest = await InventoryViewRequest.findById(request._id)
      .populate('requester', 'username avatar email');

    res.json({
      success: true,
      message: '已接受申请',
      data: populatedRequest
    });
  } catch (error) {
    console.error('接受查看库存申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/inventory-view-requests/:requestId/reject
// @desc    拒绝查看库存申请
// @access  Private
router.put('/:requestId/reject', protect, async (req, res) => {
  try {
    const request = await InventoryViewRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: '申请不存在' });
    }

    if (request.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '没有权限' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: '该申请已被处理' });
    }

    request.status = 'rejected';
    await request.save();

    // 发送通知给申请者
    const notification = new Notification({
      recipient: request.requester,
      type: 'inventory_view_rejected',
      title: '库存查看申请已拒绝',
      content: `${req.user.username} 拒绝了您的库存查看申请`,
      data: {
        ownerId: req.user._id,
        ownerUsername: req.user.username,
        requestId: request._id
      }
    });

    await notification.save();

    const populatedRequest = await InventoryViewRequest.findById(request._id)
      .populate('requester', 'username avatar email');

    res.json({
      success: true,
      message: '已拒绝申请',
      data: populatedRequest
    });
  } catch (error) {
    console.error('拒绝查看库存申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/inventory-view-requests/:requestId
// @desc    撤销/删除查看库存申请
// @access  Private
router.delete('/:requestId', protect, async (req, res) => {
  try {
    const request = await InventoryViewRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: '申请不存在' });
    }

    // 请求者可以撤销，所有者也可以撤销
    if (request.requester.toString() !== req.user._id.toString() && 
        request.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '没有权限' });
    }

    await InventoryViewRequest.findByIdAndDelete(req.params.requestId);

    res.json({
      success: true,
      message: '已删除申请'
    });
  } catch (error) {
    console.error('删除查看库存申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/inventory-view-requests/me/can-view/:userId
// @desc    检查是否可以查看某人的库存
// @access  Private
router.get('/me/can-view/:userId', protect, async (req, res) => {
  try {
    if (req.params.userId === req.user._id.toString()) {
      return res.json({
        success: true,
        canView: true,
        isOwn: true
      });
    }

    const permission = await InventoryViewRequest.findOne({
      requester: req.user._id,
      owner: req.params.userId,
      status: 'accepted'
    });

    const canView = permission && !permission.isExpired();

    res.json({
      success: true,
      canView: canView,
      isOwn: false
    });
  } catch (error) {
    console.error('检查查看权限错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/inventory-view-requests/me/permission/:userId
// @desc    获取查看某人库存的权限详情
// @access  Private
router.get('/me/permission/:userId', protect, async (req, res) => {
  try {
    if (req.params.userId === req.user._id.toString()) {
      return res.json({
        success: true,
        permission: null,
        isOwn: true,
        canView: true
      });
    }

    const permission = await InventoryViewRequest.findOne({
      requester: req.user._id,
      owner: req.params.userId
    })
      .populate('owner', 'username avatar email')
      .populate('requester', 'username avatar email');

    let canView = false;
    let processedPermission = null;

    if (permission) {
      processedPermission = permission.toObject();
      if (processedPermission.status === 'pending' && permission.isExpired()) {
        processedPermission.status = 'expired';
      }
      canView = permission.canView();
    }

    res.json({
      success: true,
      permission: processedPermission,
      isOwn: false,
      canView: canView
    });
  } catch (error) {
    console.error('获取查看权限错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/inventory-view-requests/me/received/count
// @desc    获取未处理申请数量
// @access  Private
router.get('/me/received/count', protect, async (req, res) => {
  try {
    const count = await InventoryViewRequest.countDocuments({
      owner: req.user._id,
      status: 'pending'
    });

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('获取申请数量错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
