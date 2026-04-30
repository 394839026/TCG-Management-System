const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');

router.get('/recent', protect, async (req, res) => {
  try {
    const activities = await ActivityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedActivities = activities.map(activity => {
      let timeAgo = '';
      const now = new Date();
      const diff = now - activity.createdAt;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) {
        timeAgo = '刚刚';
      } else if (minutes < 60) {
        timeAgo = `${minutes}分钟前`;
      } else if (hours < 24) {
        timeAgo = `${hours}小时前`;
      } else {
        timeAgo = `${days}天前`;
      }

      return {
        _id: activity._id,
        action: activity.action,
        item: activity.item,
        type: activity.type,
        time: timeAgo,
        createdAt: activity.createdAt
      };
    });

    res.json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { action, item, type, metadata } = req.body;

    const activity = await ActivityLog.create({
      userId: req.user._id,
      action,
      item: item || '',
      type,
      metadata: metadata || {}
    });

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;