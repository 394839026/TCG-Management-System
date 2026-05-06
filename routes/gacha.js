const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { concurrencyControl, executeWithUserLock, deductCoinsAtomic, addCoinsAtomic } = require('../middleware/concurrencyControl');
const User = require('../models/User');

// 应用并发控制中间件
router.use(concurrencyControl());

// @route   POST /api/gacha/spend
// @desc    抽卡时消耗金币（高并发安全版本）
// @access  Private
router.post('/spend', protect, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: '金币数量无效' 
      });
    }

    // 使用用户锁和原子操作扣除金币
    const result = await executeWithUserLock(req.user._id, async () => {
      const updatedUser = await deductCoinsAtomic(req.user._id, amount);
      return {
        coins: updatedUser.coins
      };
    });

    res.json({
      success: true,
      data: result,
      message: '金币扣除成功'
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '抽卡失败，请稍后再试' 
    });
  }
});

// @route   POST /api/gacha/add
// @desc    增加金币（比如每日奖励）
// @access  Private
router.post('/add', protect, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: '金币数量无效' 
      });
    }

    const user = await addCoinsAtomic(req.user._id, amount);

    res.json({
      success: true,
      data: {
        coins: user.coins
      },
      message: '金币增加成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// @route   GET /api/gacha/gift/status
// @desc    检查每日礼物状态
// @access  Private
router.get('/gift/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }

    // 检查用户是否是超级管理员
    const isSuperAdmin = user.role === 'superadmin';
    
    // 检查24小时内是否已领取
    const now = new Date();
    const lastGiftDate = user.lastGiftDate ? new Date(user.lastGiftDate) : null;
    const hasClaimedWithin24h = lastGiftDate && (now.getTime() - lastGiftDate.getTime() < 24 * 60 * 60 * 1000);

    // 普通用户0.001%概率，超级管理员99.9%概率
    // 只有未在24小时内领取过才可能显示礼包
    const showGift = !hasClaimedWithin24h && (
      (isSuperAdmin && Math.random() < 0.999) || (!isSuperAdmin && Math.random() < 0.00001)
    );

    res.json({
      success: true,
      data: {
        showGift,
        hasClaimedWithin24h,
        isSuperAdmin,
        lastGiftDate
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// @route   POST /api/gacha/gift/claim
// @desc    领取每日礼物（高并发安全版本）
// @access  Private
router.post('/gift/claim', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // 使用用户锁确保每日礼物只领取一次
    const result = await executeWithUserLock(userId, async () => {
      // 先获取用户信息检查领取状态
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查用户是否是超级管理员
      const isSuperAdmin = user.role === 'superadmin';
      
      // 检查24小时内是否已领取（所有用户都有24小时CD）
      const now = new Date();
      const lastGiftDate = user.lastGiftDate ? new Date(user.lastGiftDate) : null;
      const hasClaimedWithin24h = lastGiftDate && (now.getTime() - lastGiftDate.getTime() < 24 * 60 * 60 * 1000);
      
      if (hasClaimedWithin24h) {
        throw new Error('24小时内已领取过礼物，请稍后再试');
      }

      // 原子更新：赠送 1000 星币并记录领取时间
      const updateData = {
        $inc: { coins: 1000 },
        $set: { lastGiftDate: new Date() }
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      );

      return {
        coins: updatedUser.coins,
        isSuperAdmin
      };
    });

    res.json({
      success: true,
      data: {
        coins: result.coins
      },
      message: result.isSuperAdmin 
        ? '恭喜！超级管理员专属福利，1000星币到账！'
        : '恭喜你发现了这个小礼物，赠送你1000星币'
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '领取失败，请稍后再试' 
    });
  }
});

module.exports = router;
