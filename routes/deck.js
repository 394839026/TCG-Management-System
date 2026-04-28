const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Deck = require('../models/Deck');
const { body, validationResult } = require('express-validator');

// @route   POST /api/decks
// @desc    创建卡组
// @access  Private
router.post('/', protect, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('卡组名称需要1-100个字符'),
  body('game').isIn(['yugioh', 'magic', 'pokemon', 'cardfight', 'other']).withMessage('游戏类型无效')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, game, format, description, tags } = req.body;

    const deck = new Deck({
      name,
      game,
      format,
      description,
      tags,
      owner: req.user._id,
      cards: []
    });

    await deck.save();

    res.status(201).json({
      success: true,
      message: '卡组创建成功',
      data: deck
    });
  } catch (error) {
    console.error('创建卡组错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/decks
// @desc    获取我的卡组列表
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { owner: req.user._id };
    
    if (req.query.game) {
      filter.game = req.query.game;
    }

    const decks = await Deck.find(filter)
      .populate('cards.card')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Deck.countDocuments(filter);

    res.json({
      success: true,
      count: decks.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: decks
    });
  } catch (error) {
    console.error('获取卡组列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/decks/public
// @desc    获取公共卡组
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { isPublic: true };
    
    if (req.query.game) {
      filter.game = req.query.game;
    }
    
    if (req.query.format) {
      filter.format = req.query.format;
    }

    const decks = await Deck.find(filter)
      .populate('owner', 'username avatar')
      .select('-cards')
      .sort({ likes: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Deck.countDocuments(filter);

    res.json({
      success: true,
      count: decks.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: decks
    });
  } catch (error) {
    console.error('获取公共卡组错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/decks/:id
// @desc    获取卡组详情
// @access  Private (或Public如果卡组公开)
router.get('/:id', protect, async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id)
      .populate('owner', 'username avatar')
      .populate('cards.card')
      .populate('likes', 'username');

    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    // 检查访问权限
    if (!deck.isPublic && deck.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '您没有权限查看此卡组' });
    }

    res.json({
      success: true,
      data: deck
    });
  } catch (error) {
    console.error('获取卡组详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/decks/:id
// @desc    更新卡组
// @access  Private (owner)
router.put('/:id', protect, abac({ resource: 'deck', actions: ['write'] }), async (req, res) => {
  try {
    const { name, format, description, tags, isPublic, stats } = req.body;

    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    if (name) deck.name = name;
    if (format !== undefined) deck.format = format;
    if (description !== undefined) deck.description = description;
    if (tags) deck.tags = tags;
    if (isPublic !== undefined) deck.isPublic = isPublic;
    if (stats) deck.stats = { ...deck.stats, ...stats };

    await deck.save();

    res.json({
      success: true,
      message: '卡组更新成功',
      data: deck
    });
  } catch (error) {
    console.error('更新卡组错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/decks/:id
// @desc    删除卡组
// @access  Private (owner)
router.delete('/:id', protect, abac({ resource: 'deck', actions: ['delete'] }), async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    await deck.deleteOne();

    res.json({
      success: true,
      message: '卡组已删除'
    });
  } catch (error) {
    console.error('删除卡组错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/decks/:id/cards
// @desc    添加卡牌到卡组
// @access  Private (owner)
router.post('/:id/cards', protect, abac({ resource: 'deck', actions: ['write'] }), async (req, res) => {
  try {
    const { cardId, quantity, sideboard } = req.body;
    const deck = await Deck.findById(req.params.id);
    
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    // 检查卡牌是否已在卡组中
    const existingCard = deck.cards.find(c => c.card.toString() === cardId);
    if (existingCard) {
      existingCard.quantity += quantity || 1;
      if (sideboard !== undefined) existingCard.sideboard = sideboard;
    } else {
      deck.cards.push({
        card: cardId,
        quantity: quantity || 1,
        sideboard: sideboard || false
      });
    }

    await deck.save();

    res.json({
      success: true,
      message: '卡牌已添加到卡组',
      data: deck
    });
  } catch (error) {
    console.error('添加卡牌错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/decks/:id/cards/:cardId
// @desc    更新卡牌数量
// @access  Private (owner)
router.put('/:id/cards/:cardId', protect, abac({ resource: 'deck', actions: ['write'] }), async (req, res) => {
  try {
    const { quantity, sideboard } = req.body;
    const deck = await Deck.findById(req.params.id);
    
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    const cardEntry = deck.cards.find(c => c.card.toString() === req.params.cardId);
    if (!cardEntry) {
      return res.status(404).json({ message: '卡牌不在卡组中' });
    }

    if (quantity !== undefined) cardEntry.quantity = quantity;
    if (sideboard !== undefined) cardEntry.sideboard = sideboard;

    await deck.save();

    res.json({
      success: true,
      message: '卡牌信息已更新',
      data: deck
    });
  } catch (error) {
    console.error('更新卡牌错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/decks/:id/cards/:cardId
// @desc    从卡组移除卡牌
// @access  Private (owner)
router.delete('/:id/cards/:cardId', protect, abac({ resource: 'deck', actions: ['write'] }), async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    deck.cards = deck.cards.filter(c => c.card.toString() !== req.params.cardId);
    await deck.save();

    res.json({
      success: true,
      message: '卡牌已从卡组移除',
      data: deck
    });
  } catch (error) {
    console.error('移除卡牌错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/decks/:id/share
// @desc    分享卡组为公共
// @access  Private (owner)
router.post('/:id/share', protect, abac({ resource: 'deck', actions: ['write'] }), async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    deck.isPublic = true;
    await deck.save();

    res.json({
      success: true,
      message: '卡组已分享为公共卡组',
      data: deck
    });
  } catch (error) {
    console.error('分享卡组错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/decks/:id/share
// @desc    取消分享卡组
// @access  Private (owner)
router.delete('/:id/share', protect, abac({ resource: 'deck', actions: ['write'] }), async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    deck.isPublic = false;
    await deck.save();

    res.json({
      success: true,
      message: '已取消分享卡组',
      data: deck
    });
  } catch (error) {
    console.error('取消分享错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/decks/:id/favorite
// @desc    收藏卡组
// @access  Private
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    deck.isFavorite = true;
    await deck.save();

    res.json({
      success: true,
      message: '卡组已收藏',
      data: deck
    });
  } catch (error) {
    console.error('收藏卡组错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/decks/:id/like
// @desc    点赞卡组
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    // 检查是否已点赞
    const alreadyLiked = deck.likes.some(userId => userId.toString() === req.user._id.toString());
    if (alreadyLiked) {
      return res.status(400).json({ message: '您已点赞过此卡组' });
    }

    deck.likes.push(req.user._id);
    await deck.save();

    res.json({
      success: true,
      message: '点赞成功',
      data: deck
    });
  } catch (error) {
    console.error('点赞卡组错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/decks/:id/like
// @desc    取消点赞卡组
// @access  Private
router.delete('/:id/like', protect, async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }

    deck.likes = deck.likes.filter(userId => userId.toString() !== req.user._id.toString());
    await deck.save();

    res.json({
      success: true,
      message: '已取消点赞',
      data: deck
    });
  } catch (error) {
    console.error('取消点赞错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
