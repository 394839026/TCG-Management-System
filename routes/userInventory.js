const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const InventoryItem = require('../models/Inventory');
const UserInventory = require('../models/UserInventory');
const UserStatsHistory = require('../models/UserStatsHistory');
const Task = require('../models/Task');
const UserTask = require('../models/UserTask');
const { filterSensitiveFields, USER_INVENTORY_ALLOWED } = require('../utils/security');

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

router.get('/', protect, async (req, res) => {
  try {
    const { itemType, search, sort = 'createdAt', order = 'desc', page = 1, limit, rarity, gameType, priceMin, priceMax, showZeroQuantity, version, cardProperty } = req.query;
    console.log('=== 用户库存查询 ===');
    console.log('搜索词:', search);
    console.log('稀有度:', rarity);
    console.log('showZeroQuantity:', showZeroQuantity);
    
    // 用户库存只获取非模板的数据
    const query = { isTemplate: { $ne: true } };

    if (itemType && itemType !== 'all') {
      if (itemType.includes(',')) {
        query.itemType = { $in: itemType.split(',') };
      } else {
        query.itemType = itemType;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const searchConditions = [
        { itemName: searchRegex },
        { itemCode: searchRegex },
        { 'runeCardInfo.cardNumber': searchRegex }
      ];
      
      if (query.$or) {
        // 如果已经有 $or（来自 gameType），需要合并条件
        const gameTypeConditions = query.$or;
        delete query.$or;
        query.$and = [
          { $or: searchConditions },
          { $or: gameTypeConditions }
        ];
      } else {
        query.$or = searchConditions;
      }
    }

    if (rarity && rarity !== 'all') {
      if (rarity.includes(',')) {
        query.rarity = { $in: rarity.split(',') };
      } else {
        query.rarity = rarity;
      }
    }

    if (gameType && gameType !== 'all') {
      const gameTypeCondition = {
        $or: [
          { gameType: gameType },
          { gameType: { $elemMatch: { $eq: gameType } } }
        ]
      };
      
      if (query.$and) {
        // 如果已经有 $and（来自 search），把 gameType 条件加入进去
        query.$and.push(gameTypeCondition);
      } else if (query.$or) {
        // 如果有 $or 但没有 $and，需要改成 $and 结构
        const existingOr = query.$or;
        delete query.$or;
        query.$and = [
          { $or: existingOr },
          gameTypeCondition
        ];
      } else {
        // 直接用 gameType 的 $or 条件
        Object.assign(query, gameTypeCondition);
      }
    }

    if (version && version !== 'all') {
      if (version.includes(',')) {
        query['runeCardInfo.version'] = { $in: version.split(',') };
      } else {
        query['runeCardInfo.version'] = version;
      }
    }

    if (cardProperty && cardProperty !== 'all') {
      if (cardProperty.includes(',')) {
        query.cardProperty = { $in: cardProperty.split(',') };
      } else {
        query.cardProperty = cardProperty;
      }
    }

    if (priceMin) {
      query.value = query.value || {};
      query.value.$gte = parseFloat(priceMin);
    }
    if (priceMax) {
      query.value = query.value || {};
      query.value.$lte = parseFloat(priceMax);
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    let sortOptions = { [sort]: sortOrder };

    if (sort === 'userQuantity') {
      sortOptions = {};
    }

    const items = await InventoryItem.find(query).sort(sortOptions);
    console.log('数据库物品总数:', items.length);

    const userInventory = await UserInventory.find({ userId: req.user._id });
    console.log('用户拥有的库存记录数:', userInventory.length);
    
    const userInventoryMap = new Map();
    userInventory.forEach(ui => {
      userInventoryMap.set(ui.inventoryItemId.toString(), ui);
    });

    let itemsWithUserInfo = items.map(item => {
      const userItem = userInventoryMap.get(item._id.toString());
      return {
        ...item.toObject(),
        userQuantity: userItem?.quantity || 0,
        userValue: userItem?.value || 0,
        userIsFavorite: userItem?.isFavorite || false,
        userNotes: userItem?.notes || '',
        userInventoryId: userItem?._id || null
      };
    });

    if (showZeroQuantity === 'false') {
      itemsWithUserInfo = itemsWithUserInfo.filter(item => item.userQuantity > 0);
    }

    if (sort === 'userQuantity') {
      itemsWithUserInfo.sort((a, b) => {
        return sortOrder * (a.userQuantity - b.userQuantity);
      });
    } else if (sort === 'userValue') {
      itemsWithUserInfo.sort((a, b) => {
        return sortOrder * (a.userValue - b.userValue);
      });
    }

    // 计算总数
    const total = itemsWithUserInfo.length;
    
    // 分页
    let paginatedItems = itemsWithUserInfo;
    if (limit) {
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      paginatedItems = itemsWithUserInfo.slice(startIndex, endIndex);
    }

    res.json({
      success: true,
      count: paginatedItems.length,
      total,
      page: parseInt(page),
      pages: limit ? Math.ceil(total / parseInt(limit)) : 1,
      data: paginatedItems
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.delete('/clear-all', protect, async (req, res) => {
  try {
    const result = await UserInventory.deleteMany({ userId: req.user._id });
    res.json({
      success: true,
      message: `已清空 ${result.deletedCount} 条个人库存数据`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const userInventory = await UserInventory.find({ userId: req.user._id }).populate('inventoryItemId');
    
    const totalQuantity = userInventory.reduce((sum, ui) => sum + ui.quantity, 0);
    const totalValue = userInventory.reduce((sum, ui) => sum + (ui.quantity * ui.value), 0);
    
    const itemsWithQuantity = userInventory.filter(ui => ui.quantity > 0);
    const totalItems = itemsWithQuantity.length;
    
    // 计算物品种类数（按inventoryItemId去重）
    const uniqueItemIds = new Set(userInventory.map(ui => ui.inventoryItemId._id.toString()));
    const itemTypes = uniqueItemIds.size;
    
    // 辅助函数：检查物品是否属于某个游戏类型
    const isGameType = (item, type) => {
      if (!item.gameType) return false;
      if (Array.isArray(item.gameType)) {
        return item.gameType.includes(type);
      }
      return item.gameType === type;
    };

    // 计算种类总数（有多少种不同的卡牌
    const digimonTypeCount = itemsWithQuantity.filter(ui => isGameType(ui.inventoryItemId, 'digimon')).length;
    const runeTypeCount = itemsWithQuantity.filter(ui => isGameType(ui.inventoryItemId, 'rune')).length;
    const pokemonTypeCount = itemsWithQuantity.filter(ui => isGameType(ui.inventoryItemId, 'pokemon')).length;
    const shadowverseEvolveTypeCount = itemsWithQuantity.filter(ui => isGameType(ui.inventoryItemId, 'shadowverse-evolve')).length;
    
    // 计算物品总数（所有卡牌加起来的数量
    const digimonCount = itemsWithQuantity.filter(ui => isGameType(ui.inventoryItemId, 'digimon')).reduce((sum, ui) => sum + ui.quantity, 0);
    const runeCount = itemsWithQuantity.filter(ui => isGameType(ui.inventoryItemId, 'rune')).reduce((sum, ui) => sum + ui.quantity, 0);
    const pokemonCount = itemsWithQuantity.filter(ui => isGameType(ui.inventoryItemId, 'pokemon')).reduce((sum, ui) => sum + ui.quantity, 0);
    const shadowverseEvolveCount = itemsWithQuantity.filter(ui => isGameType(ui.inventoryItemId, 'shadowverse-evolve')).reduce((sum, ui) => sum + ui.quantity, 0);
    
    // 获取昨天的历史记录来计算变化
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    let yesterdayStats = await UserStatsHistory.findOne({
      userId: req.user._id,
      date: yesterday
    });
    
    // 记录今天的统计数据
    const todayStats = await UserStatsHistory.getOrCreateToday(req.user._id);
    todayStats.totalItems = totalItems;
    todayStats.totalQuantity = totalQuantity;
    todayStats.totalValue = totalValue;
    todayStats.itemTypes = itemTypes;
    todayStats.digimonCount = digimonCount;
    todayStats.runeCount = runeCount;
    todayStats.pokemonCount = pokemonCount;
    todayStats.shadowverseEvolveCount = shadowverseEvolveCount;
    await todayStats.save();
    
    // 计算变化
    let changes = {
      totalValueChange: 0,
      totalValuePercent: 0,
      itemTypesChange: 0,
      totalItemsChange: 0
    };
    
    if (yesterdayStats) {
      // 计算总价值变化
      const valueDiff = totalValue - yesterdayStats.totalValue;
      changes.totalValueChange = valueDiff;
      if (yesterdayStats.totalValue > 0) {
        changes.totalValuePercent = Math.round((valueDiff / yesterdayStats.totalValue) * 100);
      } else if (totalValue > 0) {
        changes.totalValuePercent = 100; // 从0到有，算100%增长
      }
      
      // 计算物品种类变化
      changes.itemTypesChange = itemTypes - yesterdayStats.itemTypes;
      
      // 计算物品总数变化
      changes.totalItemsChange = totalItems - yesterdayStats.totalItems;
    }

    res.json({
      success: true,
      data: {
        totalItems,
        totalQuantity,
        totalValue,
        digimonCount,
        runeCount,
        pokemonCount,
        shadowverseEvolveCount,
        itemTypes,
        changes
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const allowedData = filterSensitiveFields(req.body, USER_INVENTORY_ALLOWED);

    let userInventory = await UserInventory.findOne({
      userId: req.user._id,
      inventoryItemId: req.params.id
    });

    let quantityChange = 0;
    
    if (!userInventory) {
      const inventoryItem = await InventoryItem.findById(req.params.id);
      if (!inventoryItem) {
        return res.status(404).json({ message: '物品不存在' });
      }

      userInventory = await UserInventory.create({
        userId: req.user._id,
        inventoryItemId: req.params.id,
        ...allowedData
      });
      
      // 新增物品，计算变化
      quantityChange = allowedData.quantity || 1;
    } else {
      const oldQuantity = userInventory.quantity || 0;
      Object.assign(userInventory, allowedData);
      await userInventory.save();
      
      // 计算数量变化
      const newQuantity = allowedData.quantity || 0;
      if (newQuantity > oldQuantity) {
        quantityChange = newQuantity - oldQuantity;
      }
    }

    // 更新任务进度（如果数量有增加
    let taskResult = { updated: 0, completedTasks: [] };
    if (quantityChange > 0) {
      console.log(`🔄 更新添加库存，数量变化: ${quantityChange}`);
      taskResult = await updateTaskProgress(req.user._id, 'add_inventory', quantityChange);
    }

    res.json({
      success: true,
      message: '更新成功',
      data: userInventory,
      tasksUpdated: taskResult.updated,
      completedTasks: taskResult.completedTasks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
