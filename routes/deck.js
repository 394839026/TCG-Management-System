const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Deck = require('../models/Deck');
const Task = require('../models/Task');
const UserTask = require('../models/UserTask');
const { body, validationResult } = require('express-validator');

// 辅助函数：获取周期的开始时间
function getPeriodStart(taskType) {
  const now = new Date();
  const periodStart = new Date(now);
  
  if (taskType === 'daily') {
    periodStart.setHours(0, 0, 0, 0);
  } else if (taskType === 'weekly') {
    // 周一作为一周的开始
    const day = periodStart.getDay();
    const diff = periodStart.getDate() - day + (day === 0 ? -6 : 1);
    periodStart.setDate(diff);
    periodStart.setHours(0, 0, 0, 0);
  }
  
  return periodStart;
}

// 辅助函数：获取周期的结束时间
function getPeriodEnd(taskType) {
  const periodStart = getPeriodStart(taskType);
  const periodEnd = new Date(periodStart);
  
  if (taskType === 'daily') {
    periodEnd.setHours(23, 59, 59, 999);
  } else if (taskType === 'weekly') {
    periodEnd.setDate(periodStart.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);
  }
  
  return periodEnd;
}

// 更新任务进度
const updateTaskProgress = async (userId, action, count = 1) => {
  try {
    console.log(`🎯 更新任务进度，用户ID: ${userId}，动作: ${action}`);
    const now = new Date();
    
    // 获取所有相关的任务
    const tasks = await Task.find({
      isActive: true,
      'target.action': action,
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: now } }
      ]
    });
    
    console.log('📋 找到相关任务数量:', tasks.length);
    
    if (tasks.length === 0) {
      return { updated: 0, completedTasks: [] };
    }
    
    let updatedCount = 0;
    let completedTasks = [];
    
    for (const task of tasks) {
      const periodStart = getPeriodStart(task.type);
      const periodEnd = getPeriodEnd(task.type);
      
      // 查找或创建用户任务
      let userTask = await UserTask.findOne({
        userId: userId,
        taskId: task._id,
        periodStart: periodStart
      });
      
      if (!userTask) {
        userTask = new UserTask({
          userId: userId,
          taskId: task._id,
          progress: 0,
          status: 'not-started',
          periodStart: periodStart,
          periodEnd: periodEnd
        });
      }
      
      // 检查是否已经领取过奖励（一次性任务
      if (task.type === 'achievement' || task.type === 'one-time') {
        const claimedTask = await UserTask.findOne({
          userId: userId,
          taskId: task._id,
          status: 'claimed'
        });
        if (claimedTask) continue;
      }
      
      // 检查是否已经完成但未领取
      if (userTask.status === 'completed' || userTask.status === 'claimed') {
        continue;
      }
      
      // 更新进度
      userTask.progress = Math.min(
        userTask.progress + count,
        task.target.value
      );
      
      // 更新状态
      if (userTask.progress >= task.target.value) {
        userTask.status = 'completed';
        userTask.completedAt = new Date();
        completedTasks.push({
          taskId: task._id,
          taskName: task.name,
          rewards: task.rewards
        });
      } else if (userTask.progress > 0) {
        userTask.status = 'in-progress';
      } else {
        userTask.status = 'not-started';
      }
      
      await userTask.save();
      updatedCount++;
      console.log('✅ 更新任务:', task.name, '进度:', userTask.progress);
    }
    
    return { updated: updatedCount, completedTasks: completedTasks };
  } catch (error) {
    console.error('❌ 更新任务进度失败:', error);
    return { updated: 0, completedTasks: [] };
  }
};

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

    const { name, game, type, format, description, tags, isPublic, cards, legend, mainDeck, sideDeck, battlefield, runes, tokens } = req.body;
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
      type: type || 'deck',
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
    
    // 更新任务进度
    console.log('🔄 更新创建卡组任务进度');
    const taskResult = await updateTaskProgress(req.user._id, 'create_deck', 1);

    res.status(201).json({
      success: true,
      message: '卡组创建成功',
      data: deck,
      tasksUpdated: taskResult.updated,
      completedTasks: taskResult.completedTasks
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
    console.log('收到更新卡组请求, ID:', req.params.id);
    console.log('请求体:', JSON.stringify(req.body, null, 2));

    const { name, game, type, format, description, tags, isPublic, stats, cards, legend, mainDeck, sideDeck, battlefield, runes, tokens } = req.body;

    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      console.log('卡组不存在');
      return res.status(404).json({ message: '卡组不存在' });
    }
    
    console.log('找到卡组:', deck._id, '当前游戏类型:', deck.game);
    
    // 符文战场验证 - 只在明确是符文战场游戏时验证
    const effectiveGame = game || deck.game;
    if (effectiveGame === 'rune') {
      console.log('验证符文战场卡组');
      const validation = validateRuneDeck({ 
        legend: legend !== undefined ? legend : deck.legend,
        mainDeck: mainDeck !== undefined ? mainDeck : deck.mainDeck, 
        sideDeck: sideDeck !== undefined ? sideDeck : deck.sideDeck, 
        battlefield: battlefield !== undefined ? battlefield : deck.battlefield, 
        runes: runes !== undefined ? runes : deck.runes, 
        tokens: tokens !== undefined ? tokens : deck.tokens 
      });
      if (!validation.isValid) {
        console.log('验证失败:', validation.errors);
        return res.status(400).json({ 
          errors: validation.errors.map(msg => ({ msg })),
          warnings: validation.warnings 
        });
      }
      console.log('验证通过');
    }

    // 更新字段 - 使用更宽松的判断
    if (name !== undefined) deck.name = name;
    if (game !== undefined) deck.game = game;
    if (type !== undefined) deck.type = type;
    if (format !== undefined) deck.format = format;
    if (description !== undefined) deck.description = description;
    if (tags !== undefined) deck.tags = tags;
    if (isPublic !== undefined) deck.isPublic = isPublic;
    if (stats !== undefined) deck.stats = { ...deck.stats, ...stats };
    if (cards !== undefined) deck.cards = cards;
    // 更新新格式数据
    if (legend !== undefined) deck.legend = legend;
    if (mainDeck !== undefined) deck.mainDeck = mainDeck;
    if (sideDeck !== undefined) deck.sideDeck = sideDeck;
    if (battlefield !== undefined) deck.battlefield = battlefield;
    if (runes !== undefined) deck.runes = runes;
    if (tokens !== undefined) deck.tokens = tokens;

    console.log('准备保存卡组');
    await deck.save();
    console.log('卡组保存成功');

    res.json({
      success: true,
      message: '卡组更新成功',
      data: deck
    });
  } catch (error) {
    console.error('更新卡组错误:', error);
    console.error('错误详情:', error.message);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({ msg: err.message }));
      return res.status(400).json({ message: '数据验证失败', errors: validationErrors });
    }
    res.status(500).json({ message: '服务器错误', error: error.message });
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
