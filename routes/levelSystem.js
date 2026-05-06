const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Task = require('../models/Task');
const UserTask = require('../models/UserTask');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// 发送通知
const sendNotification = async (recipient, type, title, content, data = {}) => {
  try {
    await Notification.create({
      recipient,
      type,
      title,
      content,
      data,
    });
  } catch (error) {
    console.error('发送通知错误:', error);
  }
};

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

// @route   GET /api/level-system/me
// @desc    获取当前用户的等级、经验值和积分信息
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const expNeeded = user.getExpForNextLevel();
    const expProgress = user.getExpProgress();
    const canCheckIn = user.canCheckIn();
    
    res.json({
      success: true,
      data: {
        level: user.level,
        exp: user.exp,
        expNeeded: expNeeded,
        expProgress: expProgress,
        points: user.points,
        canCheckIn: canCheckIn,
        totalCheckIns: user.totalCheckIns || 0,
        lastCheckInDate: user.lastCheckInDate
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/level-system/exp
// @desc    给用户添加经验值（仅管理员）
// @access  Private (Admin only)
router.post('/exp',
  protect,
  authorize('admin', 'superadmin'),
  [
    body('userId').notEmpty().withMessage('用户ID是必填项'),
    body('amount').isInt({ min: 1 }).withMessage('经验值必须是正整数')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, amount } = req.body;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      const result = await user.addExp(amount);

      // 如果升级，发送通知
      if (result.levelUp) {
        await sendNotification(
          user._id,
          'level_up',
          '🎉 等级提升！',
          `恭喜！你已升至 ${result.newLevel} 级！`,
          { level: result.newLevel }
        );
      }

      res.json({
        success: true,
        message: '经验值添加成功',
        data: {
          userId: user._id,
          username: user.username,
          amountAdded: amount,
          newLevel: result.newLevel,
          newExp: result.exp,
          levelUp: result.levelUp
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   POST /api/level-system/points
// @desc    给用户添加积分（仅管理员）
// @access  Private (Admin only)
router.post('/points',
  protect,
  authorize('admin', 'superadmin'),
  [
    body('userId').notEmpty().withMessage('用户ID是必填项'),
    body('amount').isInt({ min: 1 }).withMessage('积分必须是正整数')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, amount, reason } = req.body;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      const success = await user.addPoints(amount);

      if (success) {
        // 发送积分变动通知
        await sendNotification(
          user._id,
          'points_change',
          '💰 积分到账！',
          `你获得了 ${amount} 积分${reason ? `：${reason}` : ''}`,
          { amount, reason, newPoints: user.points }
        );
      }

      res.json({
        success: true,
        message: '积分添加成功',
        data: {
          userId: user._id,
          username: user.username,
          amountAdded: amount,
          newPoints: user.points
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   DELETE /api/level-system/points
// @desc    扣除用户积分（仅管理员）
// @access  Private (Admin only)
router.delete('/points',
  protect,
  authorize('admin', 'superadmin'),
  [
    body('userId').notEmpty().withMessage('用户ID是必填项'),
    body('amount').isInt({ min: 1 }).withMessage('积分必须是正整数')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, amount, reason } = req.body;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      if (user.points < amount) {
        return res.status(400).json({ message: '用户积分不足' });
      }

      const success = await user.removePoints(amount);

      if (success) {
        // 发送积分变动通知
        await sendNotification(
          user._id,
          'points_change',
          '💸 积分消费',
          `你消费了 ${amount} 积分${reason ? `：${reason}` : ''}`,
          { amount, reason, newPoints: user.points }
        );
      }

      res.json({
        success: true,
        message: '积分扣除成功',
        data: {
          userId: user._id,
          username: user.username,
          amountRemoved: amount,
          newPoints: user.points
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   GET /api/level-system/leaderboard
// @desc    获取等级排行榜
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const users = await User.find({})
      .select('username avatar level exp points')
      .sort({ level: -1, exp: -1, points: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/level-system/calculate-exp/:level
// @desc    计算指定等级所需经验值
// @access  Public
router.get('/calculate-exp/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    
    if (isNaN(level) || level < 1) {
      return res.status(400).json({ message: '等级必须是大于等于1的整数' });
    }

    const expNeeded = User.getExpForLevel(level);

    res.json({
      success: true,
      data: {
        level,
        expNeeded
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/level-system/grant-daily-exp
// @desc    给用户发放每日登录经验（每日一次）
// @access  Private
router.post('/grant-daily-exp', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // 检查今天是否已经领取过每日经验
    const today = new Date().toDateString();
    const alreadyGranted = user.lastDailyExpGrant === today;
    
    if (alreadyGranted) {
      return res.status(400).json({
        success: false,
        message: '今日经验值已领取过了'
      });
    }
    
    // 每日经验值 = 10 + 等级*2
    const dailyExp = 10 + user.level * 2;
    const result = await user.addExp(dailyExp);
    
    // 记录今日已领取
    user.lastDailyExpGrant = today;
    await user.save();
    
    // 如果升级，发送通知
    if (result.levelUp) {
      await sendNotification(
        user._id,
        'level_up',
        '🎉 等级提升！',
        `恭喜！你已升至 ${result.newLevel} 级！`,
        { level: result.newLevel }
      );
    }
    
    res.json({
      success: true,
      message: `成功领取 ${dailyExp} 每日经验值！`,
      data: {
        dailyExp,
        newLevel: result.newLevel,
        newExp: result.exp,
        levelUp: result.levelUp
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/level-system/check-in
// @desc    每日签到
// @access  Private
router.post('/check-in', protect, async (req, res) => {
  console.log('🎯 收到签到请求，用户ID:', req.user._id);
  try {
    const user = await User.findById(req.user._id);
    console.log('👤 找到用户:', user.username, '当前签到状态:', {
      lastCheckInDate: user.lastCheckInDate,
      totalCheckIns: user.totalCheckIns,
      canCheckIn: user.canCheckIn()
    });
    
    const result = await user.checkIn();
    console.log('📝 签到结果:', result);
    
    if (result.success) {
      // 更新任务进度（签到任务）
      console.log('🔄 开始更新签到相关任务进度...');
      const taskResult = await updateTaskProgress(req.user._id, 'check_in', 1);
      console.log('✅ 任务更新结果:', taskResult);
      
      // 如果升级，发送通知
      if (result.levelUp) {
        await sendNotification(
          user._id,
          'level_up',
          '🎉 等级提升！',
          `恭喜！你已升至 ${result.newLevel} 级！`,
          { level: result.newLevel }
        );
      }
      
      res.json({
        success: true,
        message: result.message,
        data: {
          expGained: result.expGained,
          totalCheckIns: result.totalCheckIns,
          newLevel: result.newLevel,
          newExp: result.exp,
          levelUp: result.levelUp,
          tasksUpdated: taskResult.updated,
          completedTasks: taskResult.completedTasks
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ 签到错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
