const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const TradeListing = require('../models/TradeListing');
const TradeMessage = require('../models/TradeMessage');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// @route   POST /api/trade/listings
// @desc    发布交易信息
// @access  Private
router.post('/listings', protect, [
  body('type').isIn(['sell', 'buy', 'trade']).withMessage('交易类型无效'),
  body('items').optional().isArray().withMessage('物品列表必须是数组'),
  body('price').optional().isFloat({ min: 0 }).withMessage('价格不能为负数')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, items, requestedItems, price, expiresAt } = req.body;

    let processedItems = [];
    
    if (type === 'buy') {
      processedItems = items?.map(item => ({
        itemName: item.itemName || item.item || '未命名物品',
        quantity: item.quantity || 1,
      })) || [];
    } else {
      processedItems = items?.map(item => ({
        item: item.itemId || item.item,
        itemName: item.itemName || '未命名物品',
        quantity: item.quantity || 1,
      })) || [];
    }

    const listing = new TradeListing({
      seller: req.user._id,
      type,
      items: processedItems,
      requestedItems: requestedItems || [],
      price: price || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await listing.save();

    res.status(201).json({
      success: true,
      message: '交易信息发布成功',
      data: listing
    });
  } catch (error) {
    console.error('发布交易错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/trade/listings
// @desc    获取交易列表(支持筛选和搜索)
// @access  Public
router.get('/listings', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;

    let filter = { status: 'active' };
    
    if (req.query.type) {
      filter.type = req.query.type;
    }

    let query = TradeListing.find(filter);
    let totalQuery = TradeListing.find(filter);

    // 如果有搜索词，先找到匹配的卖家用户ID和库存物品ID
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      
      // 1. 找到用户名匹配的用户
      const matchedUsers = await User.find({ 
        username: searchRegex 
      }).select('_id');
      
      const matchedUserIds = matchedUsers.map(user => user._id);
      
      // 2. 找到物品名称匹配的库存物品
      const InventoryItem = mongoose.model('InventoryItem');
      const matchedInventoryItems = await InventoryItem.find({ 
        itemName: searchRegex 
      }).select('_id');
      
      const matchedInventoryItemIds = matchedInventoryItems.map(item => item._id);
      
      // 3. 构建搜索条件
      const searchFilter = {
        status: 'active',
        $or: [
          // 匹配卖家
          { seller: { $in: matchedUserIds } },
          // 匹配直接保存的物品名称
          { 'items.itemName': searchRegex },
          // 匹配通过引用关联的物品
          { 'items.item': { $in: matchedInventoryItemIds } },
          // 匹配期望物品名称
          { 'requestedItems.itemName': searchRegex }
        ]
      };
      
      // 如果有类型筛选，也加上
      if (req.query.type) {
        searchFilter.type = req.query.type;
      }
      
      query = TradeListing.find(searchFilter);
      totalQuery = TradeListing.find(searchFilter);
    }

    const listings = await query
      .populate('seller', 'username avatar')
      .populate('items.item')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await totalQuery.countDocuments();

    res.json({
      success: true,
      count: listings.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: listings
    });
  } catch (error) {
    console.error('获取交易列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/trade/listings/:id
// @desc    获取交易详情
// @access  Public
router.get('/listings/:id', async (req, res) => {
  try {
    const listing = await TradeListing.findById(req.params.id)
      .populate('seller', 'username avatar email')
      .populate('items.item')
      .populate('interestedUsers', 'username avatar');

    if (!listing) {
      return res.status(404).json({ message: '交易不存在' });
    }

    // 增加浏览次数
    listing.views += 1;
    await listing.save();

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('获取交易详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/trade/listings/:id
// @desc    更新交易信息
// @access  Private (seller only)
router.put('/listings/:id', protect, async (req, res) => {
  try {
    const listing = await TradeListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: '交易不存在' });
    }

    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '您没有权限修改此交易' });
    }

    const { price, expiresAt, status } = req.body;

    if (price !== undefined) listing.price = price;
    if (expiresAt !== undefined) listing.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (status) listing.status = status;

    await listing.save();

    res.json({
      success: true,
      message: '交易信息已更新',
      data: listing
    });
  } catch (error) {
    console.error('更新交易错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/trade/listings/:id
// @desc    删除交易(卖家可取消自己的订单,超级管理员可删除所有订单)
// @access  Private
router.delete('/listings/:id', protect, async (req, res) => {
  try {
    const listing = await TradeListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: '交易不存在' });
    }

    const isSeller = listing.seller.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'superadmin';
    const isAdmin = req.user.role === 'admin';

    if (!isSeller && !isSuperAdmin && !isAdmin) {
      return res.status(403).json({ message: '您没有权限操作此交易' });
    }

    if (isSuperAdmin) {
      await TradeListing.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        message: '交易已删除'
      });
    } else {
      listing.status = 'cancelled';
      await listing.save();
      res.json({
        success: true,
        message: '交易已取消'
      });
    }
  } catch (error) {
    console.error('删除交易错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/trade/listings/:id/cancel
// @desc    取消交易(卖家取消自己的订单)
// @access  Private (seller only)
router.put('/listings/:id/cancel', protect, async (req, res) => {
  try {
    const listing = await TradeListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: '交易不存在' });
    }

    const isSeller = listing.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isSeller && !isAdmin) {
      return res.status(403).json({ message: '您没有权限取消此交易' });
    }

    listing.status = 'cancelled';
    await listing.save();

    res.json({
      success: true,
      message: '交易已取消',
      data: listing
    });
  } catch (error) {
    console.error('取消交易错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/trade/my-listings
// @desc    我发布的交易
// @access  Private
router.get('/my-listings', protect, async (req, res) => {
  try {
    const listings = await TradeListing.find({ seller: req.user._id })
      .populate('items.item')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    console.error('获取我的交易错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/trade/listings/:id/respond
// @desc    回应交易(表示兴趣)
// @access  Private
router.post('/listings/:id/respond', protect, async (req, res) => {
  try {
    const listing = await TradeListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: '交易不存在' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ message: '该交易已结束' });
    }

    // 检查是否已表示兴趣
    const alreadyInterested = listing.interestedUsers.some(
      userId => userId.toString() === req.user._id.toString()
    );
    
    if (alreadyInterested) {
      return res.status(400).json({ message: '您已表示过兴趣' });
    }

    listing.interestedUsers.push(req.user._id);
    await listing.save();

    res.json({
      success: true,
      message: '已表示兴趣,卖家将收到通知',
      data: listing
    });
  } catch (error) {
    console.error('回应交易错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/trade/messages
// @desc    发送交易消息
// @access  Private
router.post('/messages', protect, [
  body('listingId').notEmpty().withMessage('交易ID是必填项'),
  body('receiverId').notEmpty().withMessage('接收者ID是必填项'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('消息内容需要1-1000个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { listingId, receiverId, content } = req.body;

    // 验证交易是否存在
    const listing = await TradeListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: '交易不存在' });
    }

    const message = new TradeMessage({
      listing: listingId,
      sender: req.user._id,
      receiver: receiverId,
      content
    });

    await message.save();

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/trade/messages/conversations
// @desc    获取对话列表
// @access  Private
router.get('/messages/conversations', protect, async (req, res) => {
  try {
    const messages = await TradeMessage.find({
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .populate('listing')
      .sort({ createdAt: -1 });

    // 按参与者分组对话
    const conversationsMap = new Map();

    for (const msg of messages) {
      const otherUserId = msg.sender._id.toString() === req.user._id.toString()
        ? msg.receiver._id.toString()
        : msg.sender._id.toString();

      if (!conversationsMap.has(otherUserId)) {
        const otherUser = msg.sender._id.toString() === req.user._id.toString()
          ? msg.receiver
          : msg.sender;

        conversationsMap.set(otherUserId, {
          _id: otherUserId,
          participants: [
            { _id: req.user._id, username: req.user.username, avatar: req.user.avatar },
            { _id: otherUser._id, username: otherUser.username, avatar: otherUser.avatar }
          ],
          listingId: msg.listing?._id,
          lastMessage: msg,
          unreadCount: 0,
          createdAt: msg.createdAt,
          updatedAt: msg.createdAt
        });
      }

      const conv = conversationsMap.get(otherUserId);
      
      // 更新最后消息
      if (new Date(msg.createdAt) > new Date(conv.updatedAt)) {
        conv.lastMessage = msg;
        conv.updatedAt = msg.createdAt;
      }

      // 统计未读消息
      if (msg.receiver._id.toString() === req.user._id.toString() && !msg.isRead) {
        conv.unreadCount++;
      }
    }

    const conversations = Array.from(conversationsMap.values());

    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    console.error('获取对话列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/trade/messages/unread-count
// @desc    获取未读消息总数
// @access  Private
router.get('/messages/unread-count', protect, async (req, res) => {
  try {
    const unreadCount = await TradeMessage.countDocuments({
      receiver: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      count: unreadCount
    });
  } catch (error) {
    console.error('获取未读消息数错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/trade/messages/:conversationId
// @desc    获取对话消息
// @access  Private
router.get('/messages/:conversationId', protect, async (req, res) => {
  try {
    const otherUserId = req.params.conversationId;

    const messages = await TradeMessage.find({
      $or: [
        { sender: req.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user._id }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('获取对话消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/trade/messages/:conversationId
// @desc    发送消息
// @access  Private
router.post('/messages/:conversationId', protect, [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('消息内容需要1-1000个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, listingId } = req.body;
    const receiverId = req.params.conversationId;

    // 验证接收者是否存在
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: '接收者不存在' });
    }

    const message = new TradeMessage({
      listing: listingId || null,
      sender: req.user._id,
      receiver: receiverId,
      content
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/trade/messages/conversations/:conversationId/read
// @desc    标记整个对话为已读
// @access  Private
router.put('/messages/conversations/:conversationId/read', protect, async (req, res) => {
  try {
    const otherUserId = req.params.conversationId;

    await TradeMessage.updateMany(
      {
        sender: otherUserId,
        receiver: req.user._id,
        isRead: false
      },
      { isRead: true }
    );

    res.json({
      success: true,
      message: '对话已标记为已读'
    });
  } catch (error) {
    console.error('标记对话已读错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/trade/messages/:listingId
// @desc    获取交易对话
// @access  Private (参与者)
router.get('/messages/:listingId', protect, async (req, res) => {
  try {
    const messages = await TradeMessage.find({ listing: req.params.listingId })
      .or([
        { sender: req.user._id },
        { receiver: req.user._id }
      ])
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('获取消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/trade/stats
// @desc    获取交易统计数据
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const activeFilter = { status: 'active' };
    
    const total = await TradeListing.countDocuments(activeFilter);
    const sellCount = await TradeListing.countDocuments({ ...activeFilter, type: 'sell' });
    const buyCount = await TradeListing.countDocuments({ ...activeFilter, type: 'buy' });
    const tradeCount = await TradeListing.countDocuments({ ...activeFilter, type: 'trade' });

    res.json({
      success: true,
      data: {
        total,
        sell: sellCount,
        buy: buyCount,
        trade: tradeCount
      }
    });
  } catch (error) {
    console.error('获取交易统计错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
