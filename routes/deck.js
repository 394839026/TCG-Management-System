const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Deck = require('../models/Deck');
const { body, validationResult } = require('express-validator');

// 符文战场卡组验证函数
const validateRuneDeck = (deck) => {
  const errors = [];
  const warnings = [];
  
  const { legend = [], mainDeck = [], sideDeck = [], battlefield = [], runes = [], tokens = [] } = deck;
  
  // 获取所有卡牌
  const allCards = [...legend, ...mainDeck, ...sideDeck, ...battlefield, ...runes, ...tokens];
  
  // 检查同名卡（除符文外）
  const cardCounts = {};
  allCards.forEach(card => {
    // 这里需要获取卡牌信息，但我们先假设验证通过
    // 在实际生产环境中需要从数据库获取卡牌属性
    cardCounts[card.card] = (cardCounts[card.card] || 0) + card.quantity;
  });
  
  // 1. 传奇验证（必须正好1张）
  const legendTotal = legend.reduce((sum, c) => sum + c.quantity, 0);
  if (legendTotal !== 1) {
    errors.push('传奇必须正好有1张');
  }
  
  // 2. 主卡组验证（必须正好40张）
  const mainTotal = mainDeck.reduce((sum, c) => sum + c.quantity, 0);
  if (mainTotal !== 40) {
    errors.push('主卡组必须正好有40张');
  }
  
  // 3. 备用卡组验证（必须正好8张）
  const sideTotal = sideDeck.reduce((sum, c) => sum + c.quantity, 0);
  if (sideTotal !== 8) {
    errors.push('备用卡组必须正好有8张');
  }
  
  // 4. 战场（必须正好3张）
  const battlefieldTotal = battlefield.reduce((sum, c) => sum + c.quantity, 0);
  if (battlefieldTotal !== 3) {
    errors.push('战场必须正好有3张');
  }
  
  // 5. 符文（必须正好12张）
  const runeTotal = runes.reduce((sum, c) => sum + c.quantity, 0);
  if (runeTotal !== 12) {
    errors.push('符文必须正好有12张');
  }
  
  return { isValid: errors.length === 0, errors, warnings };
};

// @route   POST /api/decks
// @desc    创建卡组
// @access  Private
router.post('/', protect, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('卡组名称需要1-100个字符'),
  body('game').isIn(['rune', 'digimon', 'pokemon', 'shadowverse-evolve']).withMessage('游戏类型无效')
], async (req, res) => {
  try {
    console.log('收到创建卡组请求，数据:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('验证错误:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, game, format, description, tags, isPublic, cards, legend, mainDeck, sideDeck, battlefield, runes, tokens } = req.body;
    console.log('解析后的游戏类型:', game);
    
    // 符文战场验证
    if (game === 'rune') {
      const validation = validateRuneDeck({ legend, mainDeck, sideDeck, battlefield, runes, tokens });
      if (!validation.isValid) {
        return res.status(400).json({ 
          errors: validation.errors.map(msg => ({ msg })),
          warnings: validation.warnings 
        });
      }
    }

    const deck = new Deck({
      name,
      game,
      format,
      description,
      tags,
      owner: req.user._id,
      isPublic: isPublic || false,
      legend: legend || [],
      mainDeck: mainDeck || [],
      sideDeck: sideDeck || [],
      battlefield: battlefield || [],
      runes: runes || [],
      tokens: tokens || [],
      cards: cards || [] // 兼容旧格式
    });

    await deck.save();
    console.log('卡组保存成功');

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
    const { name, game, format, description, tags, isPublic, stats, cards, legend, mainDeck, sideDeck, battlefield, runes, tokens } = req.body;

    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: '卡组不存在' });
    }
    
    // 符文战场验证
    if (game === 'rune' || deck.game === 'rune') {
      const validation = validateRuneDeck({ 
        legend: legend || deck.legend,
        mainDeck: mainDeck || deck.mainDeck, 
        sideDeck: sideDeck || deck.sideDeck, 
        battlefield: battlefield || deck.battlefield, 
        runes: runes || deck.runes, 
        tokens: tokens || deck.tokens 
      });
      if (!validation.isValid) {
        return res.status(400).json({ 
          errors: validation.errors.map(msg => ({ msg })),
          warnings: validation.warnings 
        });
      }
    }

    if (name) deck.name = name;
    if (game) deck.game = game;
    if (format !== undefined) deck.format = format;
    if (description !== undefined) deck.description = description;
    if (tags) deck.tags = tags;
    if (isPublic !== undefined) deck.isPublic = isPublic;
    if (stats) deck.stats = { ...deck.stats, ...stats };
    if (cards) deck.cards = cards;
    // 更新新格式数据
    if (legend) deck.legend = legend;
    if (mainDeck) deck.mainDeck = mainDeck;
    if (sideDeck) deck.sideDeck = sideDeck;
    if (battlefield) deck.battlefield = battlefield;
    if (runes) deck.runes = runes;
    if (tokens) deck.tokens = tokens;

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
