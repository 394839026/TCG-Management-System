const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const GachaSimulationRecord = require('../models/GachaSimulationRecord');
const UserCollectionProgress = require('../models/UserCollectionProgress');
const GachaProbability = require('../models/GachaProbability');

// ==================== 模拟抽卡记录相关 ====================

// @route   POST /api/gacha-user/simulation
// @desc    保存模拟抽卡记录
// @access  Private
router.post('/simulation', protect, async (req, res) => {
  try {
    console.log('[DEBUG] 保存抽卡记录，接收到的数据:', JSON.stringify(req.body, null, 2));
    
    const { 
      configId, 
      configName, 
      drawCount, 
      results, 
      detailedResults, 
      note, 
      tags,
      isRealGacha = false 
    } = req.body;

    if (!configId || !drawCount || !results) {
      console.log('[DEBUG] 缺少必要参数');
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 确保 detailedResults 格式正确，只保留模型中定义的字段
    let cleanedDetailedResults = [];
    if (Array.isArray(detailedResults)) {
      cleanedDetailedResults = detailedResults.map(r => ({
        rarityId: r.rarityId || r.rarity || 'N',
        rarityName: r.rarityName || '普通',
        cardName: r.cardName || '未知卡牌',
        cardId: r.cardId || undefined,
        isPity: r.isPity || false
      }));
    }

    const recordData = {
      userId: req.user._id,
      configId,
      configName: configName || '未知配置',
      drawCount,
      results,
      detailedResults: cleanedDetailedResults,
      note: note || '',
      tags: Array.isArray(tags) ? tags : [],
      isRealGacha: Boolean(isRealGacha),
    };

    console.log('[DEBUG] 准备保存的数据:', recordData);

    const record = await GachaSimulationRecord.create(recordData);

    console.log('[DEBUG] 保存成功:', record._id);

    res.status(201).json({
      success: true,
      data: record,
      message: '抽卡记录保存成功'
    });
  } catch (error) {
    console.error('[ERROR] 保存抽卡记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// @route   GET /api/gacha-user/simulation
// @desc    获取用户的模拟抽卡记录列表
// @access  Private
router.get('/simulation', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, configId } = req.query;
    
    const query = { userId: req.user._id };
    if (configId) {
      query.configId = configId;
    }

    const records = await GachaSimulationRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await GachaSimulationRecord.countDocuments(query);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// @route   GET /api/gacha-user/simulation/:id
// @desc    获取单条抽卡记录详情
// @access  Private
router.get('/simulation/:id', protect, async (req, res) => {
  try {
    const record = await GachaSimulationRecord.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// @route   DELETE /api/gacha-user/simulation/:id
// @desc    删除抽卡记录
// @access  Private
router.delete('/simulation/:id', protect, async (req, res) => {
  try {
    const record = await GachaSimulationRecord.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    await record.deleteOne();

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// ==================== 用户收集进度相关 ====================

// @route   GET /api/gacha-user/collection
// @desc    获取用户收集进度
// @access  Private
router.get('/collection', protect, async (req, res) => {
  try {
    let progress = await UserCollectionProgress.findOne({
      userId: req.user._id,
    });

    // 如果不存在，创建一个新的
    if (!progress) {
      progress = await UserCollectionProgress.create({
        userId: req.user._id,
        categories: [],
        allItems: [],
        gachaStats: {
          totalDraws: 0,
          totalSpent: 0,
          rarityStats: [],
          recentDraws: [],
        },
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// @route   POST /api/gacha-user/collection/item
// @desc    添加收集物品
// @access  Private
router.post('/collection/item', protect, async (req, res) => {
  try {
    const item = req.body;
    console.log('[DEBUG] 添加收集物品，接收到的数据:', JSON.stringify(item, null, 2));

    if (!item.itemId || !item.itemName) {
      console.log('[DEBUG] 缺少必要参数');
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    let progress = await UserCollectionProgress.findOne({
      userId: req.user._id,
    });

    console.log('[DEBUG] 找到的用户进度:', progress ? '存在' : '不存在');

    if (!progress) {
      console.log('[DEBUG] 创建新的用户进度');
      progress = await UserCollectionProgress.create({
        userId: req.user._id,
        categories: [],
        allItems: [],
        gachaStats: {
          totalDraws: 0,
          totalSpent: 0,
          rarityStats: [],
          recentDraws: [],
        },
      });
    }

    // 设置默认值
    const newItem = {
      itemType: item.itemType || 'card',
      itemId: item.itemId,
      itemName: item.itemName,
      rarity: item.rarity || '',
      count: item.count || 1,
      source: item.source || 'gacha',
      sourceDetail: item.sourceDetail || '',
      note: item.note || '',
      firstObtainedAt: new Date(),
      lastObtainedAt: new Date(),
      spent: item.spent || 0,
    };

    console.log('[DEBUG] 准备添加的物品:', newItem);

    await progress.addCollectedItem(newItem);

    // 重新获取最新的数据
    const updatedProgress = await UserCollectionProgress.findOne({
      userId: req.user._id,
    });

    console.log('[DEBUG] 添加完成后的进度数据:', updatedProgress);

    res.json({
      success: true,
      data: updatedProgress,
      message: '物品添加成功'
    });
  } catch (error) {
    console.error('[ERROR] 添加收集物品失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// @route   PUT /api/gacha-user/collection/item/:itemId
// @desc    更新收集物品
// @access  Private
router.put('/collection/item/:itemId', protect, async (req, res) => {
  try {
    const { itemId } = req.params;
    const updateData = req.body;

    const progress = await UserCollectionProgress.findOne({
      userId: req.user._id,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: '收集进度不存在'
      });
    }

    const itemIndex = progress.allItems.findIndex(
      i => i.itemId === itemId || i._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '物品不存在'
      });
    }

    // 更新物品
    if (updateData.count !== undefined) {
      progress.allItems[itemIndex].count = updateData.count;
    }
    if (updateData.note !== undefined) {
      progress.allItems[itemIndex].note = updateData.note;
    }

    await progress.save();

    res.json({
      success: true,
      data: progress,
      message: '更新成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// @route   DELETE /api/gacha-user/collection/item/:itemId
// @desc    删除收集物品
// @access  Private
router.delete('/collection/item/:itemId', protect, async (req, res) => {
  try {
    const { itemId } = req.params;

    const progress = await UserCollectionProgress.findOne({
      userId: req.user._id,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: '收集进度不存在'
      });
    }

    const itemIndex = progress.allItems.findIndex(
      i => i.itemId === itemId || i._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '物品不存在'
      });
    }

    const removedItem = progress.allItems[itemIndex];
    progress.totalCollected -= removedItem.count;
    progress.totalUnique -= 1;
    progress.allItems.splice(itemIndex, 1);

    await progress.save();

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// @route   GET /api/gacha-user/stats
// @desc    获取用户抽卡统计
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const progress = await UserCollectionProgress.findOne({
      userId: req.user._id,
    });

    if (!progress) {
      return res.json({
        success: true,
        data: {
          totalDraws: 0,
          totalSpent: 0,
          rarityStats: [],
          recentDraws: [],
          totalCollected: 0,
          totalUnique: 0,
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...progress.gachaStats,
        totalCollected: progress.totalCollected,
        totalUnique: progress.totalUnique,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
