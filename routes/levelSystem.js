const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
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
          levelUp: result.levelUp
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
