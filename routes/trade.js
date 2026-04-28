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

    const listing = new TradeListing({
      seller: req.user._id,
      type,
      items: items || [],
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
// @desc    获取交易列表(支持筛选)
// @access  Public
router.get('/listings', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { status: 'active' };
    
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const listings = await TradeListing.find(filter)
      .populate('seller', 'username avatar')
      .populate('items.item')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await TradeListing.countDocuments(filter);

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
// @desc    取消交易
// @access  Private (seller only)
router.delete('/listings/:id', protect, async (req, res) => {
  try {
    const listing = await TradeListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: '交易不存在' });
    }

    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '您没有权限取消此交易' });
    }

    listing.status = 'cancelled';
    await listing.save();

    res.json({
      success: true,
      message: '交易已取消'
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

// @route   PUT /api/trade/messages/:id/read
// @desc    标记消息已读
// @access  Private (receiver)
router.put('/messages/:id/read', protect, async (req, res) => {
  try {
    const message = await TradeMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: '消息不存在' });
    }

    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '您没有权限操作此消息' });
    }

    message.isRead = true;
    await message.save();

    res.json({
      success: true,
      message: '消息已标记为已读',
      data: message
    });
  } catch (error) {
    console.error('标记已读错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
