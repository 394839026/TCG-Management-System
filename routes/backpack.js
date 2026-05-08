const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Backpack = require('../models/Backpack');

function generateRedemptionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i !== 15) {
      code += '-';
    }
  }
  return code;
}

async function generateUniqueCode() {
  let code;
  let attempts = 0;
  do {
    code = generateRedemptionCode();
    attempts++;
  } while (await Backpack.findOne({ redemptionCode: code }) && attempts < 10);
  
  if (attempts >= 10) {
    throw new Error('无法生成唯一兑换码');
  }
  
  return code;
}

router.get('/my', protect, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = { userId: req.user._id };
    
    if (status && ['unused', 'used', 'expired'].includes(status)) {
      query.status = status;
    }
    
    const now = new Date();
    await Backpack.updateMany(
      { userId: req.user._id, status: 'unused', expirationDate: { $exists: true, $lt: now } },
      { status: 'expired' }
    );
    
    const items = await Backpack.find(query)
      .populate('storeItemId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/my/count', protect, async (req, res) => {
  try {
    const now = new Date();
    await Backpack.updateMany(
      { userId: req.user._id, status: 'unused', expirationDate: { $exists: true, $lt: now } },
      { status: 'expired' }
    );
    
    const counts = await Backpack.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const result = {
      unused: 0,
      used: 0,
      expired: 0
    };
    
    counts.forEach(item => {
      if (result[item._id] !== undefined) {
        result[item._id] = item.count;
      }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/use/:id', protect, async (req, res) => {
  try {
    const item = await Backpack.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!item) {
      return res.status(404).json({ success: false, message: '背包物品不存在' });
    }
    
    if (item.status !== 'unused') {
      return res.status(400).json({ success: false, message: '物品已使用或已过期' });
    }
    
    const now = new Date();
    if (item.expirationDate && item.expirationDate < now) {
      item.status = 'expired';
      await item.save();
      return res.status(400).json({ success: false, message: '物品已过期' });
    }
    
    item.status = 'used';
    item.usedAt = now;
    await item.save();
    
    res.json({
      success: true,
      data: item,
      message: '兑换码已使用'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/batch-use', protect, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: '请提供物品ID列表' });
    }
    
    const now = new Date();
    const result = await Backpack.updateMany(
      {
        _id: { $in: ids },
        userId: req.user._id,
        status: 'unused',
        $or: [
          { expirationDate: { $exists: false } },
          { expirationDate: { $gte: now } }
        ]
      },
      { status: 'used', usedAt: now }
    );
    
    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `成功使用 ${result.modifiedCount} 个物品`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await Backpack.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!item) {
      return res.status(404).json({ success: false, message: '背包物品不存在' });
    }
    
    await item.deleteOne();
    
    res.json({
      success: true,
      message: '物品已删除'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = { router, generateUniqueCode };