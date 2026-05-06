const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const UserTask = require('../models/UserTask');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

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
    periodEnd.setDate(periodEnd.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);
  }
  
  return periodEnd;
}

// @route   GET /api/tasks
// @desc    获取所有可用任务
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    
    // 获取所有激活的任务
    const tasks = await Task.find({
      isActive: true,
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: now } }
      ]
    }).sort({ sortOrder: 1, createdAt: -1 });
    
    // 获取用户在当前周期的任务进度
    const userTaskPromises = tasks.map(async (task) => {
      const periodStart = getPeriodStart(task.type);
      
      let userTask = await UserTask.findOne({
        userId: req.user._id,
        taskId: task._id,
        periodStart: periodStart
      });
      
      return {
        ...task.toObject(),
        userProgress: userTask || null
      };
    });
    
    const tasksWithProgress = await Promise.all(userTaskPromises);
    
    res.json({
      success: true,
      data: tasksWithProgress
    });
  } catch (error) {
    console.error('获取任务失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/tasks/my
// @desc    获取用户自己的任务进度
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const now = new Date();
    
    // 获取所有激活的任务
    const tasks = await Task.find({
      isActive: true,
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: now } }
      ]
    }).sort({ sortOrder: 1, createdAt: -1 });
    
    // 获取用户在当前周期的所有任务进度
    const dailyPeriodStart = getPeriodStart('daily');
    const weeklyPeriodStart = getPeriodStart('weekly');
    
    const userTasks = await UserTask.find({
      userId: req.user._id,
      $or: [
        { periodStart: dailyPeriodStart },
        { periodStart: weeklyPeriodStart },
        { 'task.type': { $in: ['achievement', 'one-time'] } }
      ]
    });
    
    // 合并任务和进度
    const result = tasks.map(task => {
      const periodStart = getPeriodStart(task.type);
      const userTask = userTasks.find(ut => 
        ut.taskId.toString() === task._id.toString() && 
        (task.type === 'achievement' || task.type === 'one-time' || 
         ut.periodStart.getTime() === periodStart.getTime())
      );
      
      return {
        ...task.toObject(),
        userProgress: userTask || null
      };
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取我的任务失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/tasks/:taskId/claim
// @desc    领取任务奖励
// @access  Private
router.post('/:taskId/claim', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    const periodStart = getPeriodStart(task.type);
    
    // 查找用户的任务进度
    let userTask = await UserTask.findOne({
      userId: req.user._id,
      taskId: task._id,
      periodStart: periodStart
    });
    
    if (!userTask) {
      return res.status(404).json({ message: '任务进度不存在' });
    }
    
    if (userTask.status !== 'completed') {
      return res.status(400).json({ message: '任务尚未完成' });
    }
    
    if (userTask.status === 'claimed') {
      return res.status(400).json({ message: '奖励已经领取' });
    }
    
    // 获取用户
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 发放奖励
    let levelUpResult = null;
    if (task.rewards.exp > 0) {
      levelUpResult = await user.addExp(task.rewards.exp);
    }
    if (task.rewards.points > 0) {
      await user.addPoints(task.rewards.points);
    }
    if (task.rewards.coins > 0) {
      await user.addCoins(task.rewards.coins);
    }
    
    // 更新任务状态为已领取
    userTask.status = 'claimed';
    userTask.claimedAt = new Date();
    await userTask.save();
    
    res.json({
      success: true,
      message: '奖励领取成功',
      data: {
        rewards: task.rewards,
        levelUp: levelUpResult?.levelUp || false,
        newLevel: levelUpResult?.newLevel || user.level
      }
    });
  } catch (error) {
    console.error('领取奖励失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/tasks/init-default
// @desc    初始化默认任务（管理员
// @access  Private, Admin/SuperAdmin
router.post('/init-default', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const defaultTasks = [
      // 每日任务
      {
        name: '每日签到',
        description: '完成每日签到',
        type: 'daily',
        category: 'other',
        target: { action: 'check_in', value: 1 },
        rewards: { exp: 5, points: 10, coins: 5 },
        sortOrder: 1
      },
      {
        name: '添加物品',
        description: '在个人库存中添加3个物品',
        type: 'daily',
        category: 'inventory',
        target: { action: 'add_inventory', value: 3 },
        rewards: { exp: 10, points: 20, coins: 10 },
        sortOrder: 2
      },
      {
        name: '创建卡组',
        description: '创建或编辑1个卡组',
        type: 'daily',
        category: 'deck',
        target: { action: 'create_deck', value: 1 },
        rewards: { exp: 8, points: 15, coins: 8 },
        sortOrder: 3
      },
      // 每周任务
      {
        name: '卡牌收藏家',
        description: '一周内累计添加20个物品',
        type: 'weekly',
        category: 'inventory',
        target: { action: 'add_inventory', value: 20 },
        rewards: { exp: 50, points: 100, coins: 50 },
        sortOrder: 10
      },
      {
        name: '活跃玩家',
        description: '一周内完成3次签到',
        type: 'weekly',
        category: 'other',
        target: { action: 'check_in', value: 3 },
        rewards: { exp: 30, points: 60, coins: 30 },
        sortOrder: 11
      },
      // 成就任务
      {
        name: '初来乍到',
        description: '完成首次签到',
        type: 'achievement',
        category: 'other',
        target: { action: 'check_in', value: 1 },
        rewards: { exp: 20, points: 50, coins: 25 },
        sortOrder: 100
      },
      {
        name: '收藏达人',
        description: '个人库存中拥有50种不同的物品',
        type: 'achievement',
        category: 'inventory',
        target: { action: 'unique_items', value: 50 },
        rewards: { exp: 100, points: 200, coins: 100 },
        sortOrder: 101
      }
    ];

    // 删除现有的默认任务（可选
    // await Task.deleteMany({});

    console.log('开始创建默认任务...');
    // 创建新任务
    const createdTasks = await Task.create(defaultTasks);
    console.log('默认任务创建成功:', createdTasks.length);

    res.json({
      success: true,
      message: '默认任务初始化成功',
      data: {
        count: createdTasks.length,
        tasks: createdTasks
      }
    });
  } catch (error) {
    console.error('初始化默认任务失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '初始化默认任务失败',
      error: error.message 
    });
  }
});

// =============================================
// 任务进度更新接口（供内部调用
// =============================================

// @route   POST /api/tasks/progress/:action
// @desc    更新任务进度
// @access  Private
router.post('/progress/:action', protect, async (req, res) => {
  try {
    const { action } = req.params;
    const { inventoryItemId, cardType, gameType, count = 1 } = req.body;
    
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
    
    if (tasks.length === 0) {
      return res.json({
        success: true,
        message: '没有需要更新的任务',
        data: { updated: 0 }
      });
    }
    
    let updatedCount = 0;
    let completedTasks = [];
    
    for (const task of tasks) {
      // 检查额外的条件（如果有的话）
      let shouldUpdate = true;
      
      if (task.target.inventoryItemId && 
          task.target.inventoryItemId.toString() !== inventoryItemId?.toString()) {
        shouldUpdate = false;
      }
      if (task.target.cardType && task.target.cardType !== cardType) {
        shouldUpdate = false;
      }
      if (task.target.gameType && task.target.gameType !== gameType) {
        shouldUpdate = false;
      }
      
      if (!shouldUpdate) continue;
      
      const periodStart = getPeriodStart(task.type);
      const periodEnd = getPeriodEnd(task.type);
      
      // 查找或创建用户任务
      let userTask = await UserTask.findOne({
        userId: req.user._id,
        taskId: task._id,
        periodStart: periodStart
      });
      
      if (!userTask) {
        userTask = new UserTask({
          userId: req.user._id,
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
          userId: req.user._id,
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
    }
    
    res.json({
      success: true,
      message: '任务进度更新成功',
      data: {
        updated: updatedCount,
        completedTasks: completedTasks
      }
    });
  } catch (error) {
    console.error('更新任务进度失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// =============================================
// 管理员接口
// =============================================

// @route   GET /api/tasks/admin/all
// @desc    获取所有任务（含未激活
// @access  Private, Admin/SuperAdmin
router.get('/admin/all', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const tasks = await Task.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('获取所有任务失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/tasks/admin
// @desc    创建新任务
// @access  Private, Admin/SuperAdmin
router.post('/admin', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    console.log('收到创建任务请求:', JSON.stringify(req.body, null, 2));
    
    // 确保rewards对象有完整的默认值
    if (req.body.rewards) {
      req.body.rewards = {
        exp: req.body.rewards.exp !== undefined ? req.body.rewards.exp : 0,
        points: req.body.rewards.points !== undefined ? req.body.rewards.points : 0,
        coins: req.body.rewards.coins !== undefined ? req.body.rewards.coins : 0
      };
    }
    
    const task = await Task.create(req.body);
    console.log('任务创建成功:', task);
    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: task
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: '数据验证失败', 
        errors: errors 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: error.message 
    });
  }
});

// @route   PUT /api/tasks/admin/:id
// @desc    更新任务
// @access  Private, Admin/SuperAdmin
router.put('/admin/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    console.log('更新任务请求:', req.params.id, JSON.stringify(req.body, null, 2));
    
    // 确保rewards对象有完整的默认值
    if (req.body.rewards) {
      req.body.rewards = {
        exp: req.body.rewards.exp !== undefined ? req.body.rewards.exp : 0,
        points: req.body.rewards.points !== undefined ? req.body.rewards.points : 0,
        coins: req.body.rewards.coins !== undefined ? req.body.rewards.coins : 0
      };
    }
    
    const task = await Task.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    res.json({
      success: true,
      message: '任务更新成功',
      data: task
    });
  } catch (error) {
    console.error('更新任务失败:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: '数据验证失败', 
        errors: errors 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: error.message 
    });
  }
});

// @route   DELETE /api/tasks/admin/:id
// @desc    删除任务
// @access  Private, Admin/SuperAdmin
router.delete('/admin/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    res.json({
      success: true,
      message: '任务删除成功'
    });
  } catch (error) {
    console.error('删除任务失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: error.message 
    });
  }
});

module.exports = router;
