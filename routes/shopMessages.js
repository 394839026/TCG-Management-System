const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { ShopConversation, ShopMessage } = require('../models/ShopConversation');
const Shop = require('../models/Shop');

// @route   GET /api/shop-messages/conversations
// @desc    获取用户的店铺对话列表
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    // 获取用户参与的所有店铺对话
    const conversations = await ShopConversation.find({ customer: req.user._id })
      .populate('shop', 'name logo')
      .populate('customer', 'username avatar')
      .sort({ updatedAt: -1 });

    const result = conversations.map(conv => {
      const unreadCount = conv.unreadCounts?.get(req.user._id.toString()) || 0;
      return {
        _id: conv._id,
        shop: conv.shop,
        customer: conv.customer,
        lastMessage: conv.lastMessage,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        isShopConversation: true
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取店铺对话列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shop-messages/conversations/:conversationId
// @desc    获取店铺对话消息
// @access  Private
router.get('/conversations/:conversationId', protect, async (req, res) => {
  try {
    const conversation = await ShopConversation.findById(req.params.conversationId)
      .populate('shop', 'name logo employees')
      .populate('customer', 'username avatar');

    if (!conversation) {
      return res.status(404).json({ message: '对话不存在' });
    }

    // 检查用户是否有权限访问此对话（顾客或店铺员工）
    const isCustomer = conversation.customer._id.toString() === req.user._id.toString();
    const shop = await Shop.findById(conversation.shop._id);
    const isShopEmployee = shop && shop.employees.some(
      e => e.user.toString() === req.user._id.toString()
    );

    if (!isCustomer && !isShopEmployee && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权访问此对话' });
    }

    // 获取消息列表
    const messages = await ShopMessage.find({ conversation: conversation._id })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 });

    // 将消息标记为已读
    await ShopMessage.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: req.user._id },
        isRead: { $ne: req.user._id }
      },
      { $addToSet: { isRead: req.user._id } }
    );

    // 重置未读计数
    conversation.unreadCounts.set(req.user._id.toString(), 0);
    await conversation.save();

    res.json({
      success: true,
      data: {
        conversation: {
          _id: conversation._id,
          shop: conversation.shop,
          customer: conversation.customer,
          createdAt: conversation.createdAt
        },
        messages
      }
    });
  } catch (error) {
    console.error('获取店铺对话消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/shop-messages/conversations/:conversationId
// @desc    发送店铺对话消息
// @access  Private
router.post('/conversations/:conversationId', protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: '消息内容不能为空' });
    }

    const conversation = await ShopConversation.findById(req.params.conversationId)
      .populate('shop', 'name logo employees');

    if (!conversation) {
      return res.status(404).json({ message: '对话不存在' });
    }

    // 检查用户是否有权限发送消息（顾客或店铺员工）
    const isCustomer = conversation.customer.toString() === req.user._id.toString();
    const isShopEmployee = conversation.shop.employees.some(
      e => e.user.toString() === req.user._id.toString()
    );

    if (!isCustomer && !isShopEmployee && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权发送消息' });
    }

    // 创建消息
    const message = await ShopMessage.create({
      conversation: conversation._id,
      sender: req.user._id,
      content: content.trim()
    });

    await message.populate('sender', 'username avatar');

    // 更新对话的最后消息和未读计数
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();

    // 增加另一方的未读计数
    const otherUserId = isCustomer
      ? conversation.shop.employees.map(e => e.user.toString())
      : [conversation.customer.toString()];

    otherUserId.forEach(userId => {
      if (userId !== req.user._id.toString()) {
        const currentCount = conversation.unreadCounts.get(userId) || 0;
        conversation.unreadCounts.set(userId, currentCount + 1);
      }
    });

    await conversation.save();

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('发送店铺消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/shop-messages/contact/:shopId
// @desc    联系店铺（创建或获取对话）
// @access  Private
router.post('/contact/:shopId', protect, async (req, res) => {
  try {
    const { initialMessage } = req.body;
    const shopId = req.params.shopId;

    // 查找店铺
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 查找或创建对话
    let conversation = await ShopConversation.findOne({
      shop: shopId,
      customer: req.user._id
    });

    if (!conversation) {
      conversation = await ShopConversation.create({
        shop: shopId,
        customer: req.user._id,
        unreadCounts: new Map()
      });
    }

    // 如果有初始消息，发送它
    if (initialMessage && initialMessage.trim().length > 0) {
      const message = await ShopMessage.create({
        conversation: conversation._id,
        sender: req.user._id,
        content: initialMessage.trim()
      });

      await message.populate('sender', 'username avatar');

      conversation.lastMessage = message;
      conversation.updatedAt = new Date();

      // 增加店铺员工的未读计数
      shop.employees.forEach(e => {
        const userId = e.user.toString();
        const currentCount = conversation.unreadCounts.get(userId) || 0;
        conversation.unreadCounts.set(userId, currentCount + 1);
      });

      await conversation.save();

      return res.json({
        success: true,
        data: {
          conversationId: conversation._id,
          message
        }
      });
    }

    await conversation.populate('shop', 'name logo');
    await conversation.populate('customer', 'username avatar');

    res.json({
      success: true,
      data: {
        conversationId: conversation._id,
        conversation
      }
    });
  } catch (error) {
    console.error('联系店铺错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shop-messages/unread-count
// @desc    获取店铺消息未读总数
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const conversations = await ShopConversation.find({ customer: req.user._id });

    let totalUnread = 0;
    conversations.forEach(conv => {
      totalUnread += conv.unreadCounts.get(req.user._id.toString()) || 0;
    });

    res.json({
      success: true,
      count: totalUnread
    });
  } catch (error) {
    console.error('获取未读消息数错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
