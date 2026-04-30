const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Friendship = require('../models/Friendship');

// @route   GET /api/friends
// @desc    获取好友列表
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('获取好友列表 - 用户ID:', req.user._id);
    
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user._id, status: 'accepted' },
        { addressee: req.user._id, status: 'accepted' }
      ]
    }).populate('addressee', 'username avatar email')
      .populate('requester', 'username avatar email')
      .sort({ createdAt: -1 });

    console.log('找到的友谊关系:', friendships.length);
    console.log('友谊关系详情:', friendships);

    const friends = friendships.map(f => {
      const isRequester = f.requester._id.toString() === req.user._id.toString();
      const friend = isRequester ? f.addressee : f.requester;
      return {
        _id: f._id,
        userId: friend._id,
        friendId: friend._id,
        friend: friend,
        status: f.status,
        createdAt: f.createdAt
      };
    });

    console.log('处理后的好友列表:', friends);

    res.json({
      success: true,
      count: friends.length,
      data: friends
    });
  } catch (error) {
    console.error('获取好友列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/friends/requests
// @desc    获取好友请求列表
// @access  Private
router.get('/requests', protect, async (req, res) => {
  try {
    const requests = await Friendship.find({
      addressee: req.user._id,
      status: 'pending'
    }).populate('requester', 'username avatar email')
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map(r => ({
      _id: r._id,
      from: r.requester,
      to: r.addressee,
      status: r.status,
      createdAt: r.createdAt
    }));

    res.json({
      success: true,
      count: formattedRequests.length,
      data: formattedRequests
    });
  } catch (error) {
    console.error('获取好友请求错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/friends/requests
// @desc    发送好友请求
// @access  Private
router.post('/requests', protect, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: '用户ID不能为空' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: '不能添加自己为好友' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.user._id, addressee: userId },
        { requester: userId, addressee: req.user._id }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ message: '你们已经是好友了' });
      } else if (existingFriendship.status === 'pending') {
        if (existingFriendship.requester.toString() === req.user._id.toString()) {
          return res.status(400).json({ message: '已发送过好友请求' });
        } else {
          return res.status(400).json({ message: '对方已发送过好友请求' });
        }
      }
    }

    const friendship = new Friendship({
      requester: req.user._id,
      addressee: userId,
      status: 'pending'
    });

    await friendship.save();

    res.status(201).json({
      success: true,
      message: '好友请求已发送',
      data: friendship
    });
  } catch (error) {
    console.error('发送好友请求错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/friends/requests/:requestId/accept
// @desc    接受好友请求
// @access  Private
router.put('/requests/:requestId/accept', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship) {
      return res.status(404).json({ message: '好友请求不存在' });
    }

    if (friendship.addressee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '没有权限' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ message: '该请求已被处理' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json({
      success: true,
      message: '已接受好友请求',
      data: friendship
    });
  } catch (error) {
    console.error('接受好友请求错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/friends/requests/:requestId/reject
// @desc    拒绝好友请求
// @access  Private
router.put('/requests/:requestId/reject', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship) {
      return res.status(404).json({ message: '好友请求不存在' });
    }

    if (friendship.addressee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '没有权限' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ message: '该请求已被处理' });
    }

    friendship.status = 'rejected';
    await friendship.save();

    res.json({
      success: true,
      message: '已拒绝好友请求',
      data: friendship
    });
  } catch (error) {
    console.error('拒绝好友请求错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/friends/:friendId
// @desc    删除好友
// @access  Private
router.delete('/:friendId', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: req.user._id, addressee: req.params.friendId, status: 'accepted' },
        { requester: req.params.friendId, addressee: req.user._id, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ message: '好友关系不存在' });
    }

    res.json({
      success: true,
      message: '已删除好友'
    });
  } catch (error) {
    console.error('删除好友错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/friends/requests/count
// @desc    获取未读好友请求数量
// @access  Private
router.get('/requests/count', protect, async (req, res) => {
  try {
    const count = await Friendship.countDocuments({
      addressee: req.user._id,
      status: 'pending'
    });

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('获取好友请求数量错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/friends/search
// @desc    搜索用户
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: '搜索关键词至少2个字符' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('_id username avatar email')
      .limit(20);

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;