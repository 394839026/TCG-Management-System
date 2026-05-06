const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { GroupChat, GROUP_LEVEL_CONFIG } = require('../models/GroupChat');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { filterSensitiveFields, GROUP_CHAT_ALLOWED } = require('../utils/security');

// 检查是否是管理员或超级管理员的中间件
const isAdminUser = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: '只有管理员或超级管理员可以创建群聊'
    });
  }
  next();
};

// @route   GET /api/group-chats
// @desc    获取当前用户的群聊列表
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const groupChats = await GroupChat.find({
      'members.user': req.user._id
    })
      .populate('creator', 'username avatar')
      .populate('members.user', 'username avatar')
      .populate('team', 'name logo')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // 为每个群聊计算未读消息数
    const groupChatsWithUnread = groupChats.map(groupChat => {
      // 转换为普通对象
      const groupObj = groupChat.toObject();
      
      // 计算未读消息数
      let unreadCount = 0;
      if (groupObj.messages && groupObj.messages.length > 0) {
        unreadCount = groupObj.messages.filter(msg => 
          !msg.readBy.some(readerId => 
            readerId.toString() === req.user._id.toString()
          )
        ).length;
      }
      
      return {
        ...groupObj,
        unreadCount
      };
    });

    const total = await GroupChat.countDocuments({
      'members.user': req.user._id
    });

    res.json({
      success: true,
      data: groupChatsWithUnread,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取群聊列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/group-chats/all
// @desc    获取所有群聊（管理员）
// @access  Private, Admin only
router.get('/all', protect, isAdminUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const groupChats = await GroupChat.find()
      .populate('creator', 'username avatar')
      .populate('team', 'name logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await GroupChat.countDocuments();

    res.json({
      success: true,
      data: groupChats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取所有群聊错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/group-chats
// @desc    创建群聊（只有管理员或超级管理员）
// @access  Private, Admin only
router.post('/', protect, isAdminUser, async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      type = 'custom',
      isPublic = false,
      maxMembers = 100,
      memberIds = []
    } = req.body;

    // 创建群聊成员列表，先添加创建者
    const members = [
      {
        user: req.user._id,
        role: 'owner',
        joinedAt: new Date()
      }
    ];

    // 添加其他成员
    for (const memberId of memberIds) {
      if (memberId.toString() !== req.user._id.toString()) {
        members.push({
          user: memberId,
          role: 'member',
          joinedAt: new Date()
        });
      }
    }

    const groupChat = await GroupChat.create({
      name,
      description,
      icon,
      creator: req.user._id,
      members,
      type,
      isPublic,
      maxMembers,
      settings: {
        allowInvite: true,
        allowImages: true,
        allowAnonymous: false,
        allowNicknameChange: true
      }
    });

    await groupChat.populate('creator', 'username avatar');
    await groupChat.populate('members.user', 'username avatar');

    res.status(201).json({
      success: true,
      message: '群聊创建成功',
      data: groupChat
    });
  } catch (error) {
    console.error('创建群聊错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/group-chats/:id
// @desc    获取群聊详情
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const groupChat = await GroupChat.findById(req.params.id)
      .populate('creator', 'username avatar')
      .populate('members.user', 'username avatar')
      .populate('team', 'name logo');

    if (!groupChat) {
      return res.status(404).json({ message: '群聊不存在' });
    }

    // 检查用户是否是成员
    if (!GroupChat.isMember(groupChat, req.user._id) &&
        req.user.role !== 'admin' &&
        req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权访问此群聊' });
    }

    res.json({
      success: true,
      data: groupChat
    });
  } catch (error) {
    console.error('获取群聊详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/group-chats/:id
// @desc    更新群聊信息（只有群聊管理员和创建者）
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const groupChat = await GroupChat.findById(req.params.id);

    if (!groupChat) {
      return res.status(404).json({ message: '群聊不存在' });
    }

    // 检查权限
    if (!GroupChat.isAdmin(groupChat, req.user._id) &&
        req.user.role !== 'admin' &&
        req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权修改此群聊' });
    }

    const allowedData = filterSensitiveFields(req.body, GROUP_CHAT_ALLOWED);

    // 检查是否是订单群聊（名称以 "ORD" 开头的）或战队群聊
    const isOrderGroupChat = groupChat.name && groupChat.name.startsWith('ORD');
    const isTeamGroupChat = groupChat.type === 'team';
    
    // 如果是订单群聊或战队群聊，则不允许修改名称
    if (allowedData.name) {
      if (isOrderGroupChat || isTeamGroupChat) {
        delete allowedData.name;
      }
    }

    Object.assign(groupChat, allowedData);

    await groupChat.save();
    await groupChat.populate('creator', 'username avatar');
    await groupChat.populate('members.user', 'username avatar');

    res.json({
      success: true,
      message: '群聊信息已更新',
      data: groupChat
    });
  } catch (error) {
    console.error('更新群聊错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/group-chats/all
// @desc    删除所有群聊（仅超级管理员）
// @access  Private, Superadmin only
router.delete('/all', protect, async (req, res) => {
  try {
    // 检查权限 - 只有超级管理员可以删除所有群聊
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false,
        message: '只有超级管理员可以解散所有群聊' 
      });
    }

    // 获取所有群聊
    const groupChats = await GroupChat.find();
    const deletedCount = groupChats.length;

    // 删除所有群聊
    await GroupChat.deleteMany({});

    res.json({
      success: true,
      message: `已删除 ${deletedCount} 个群聊`,
      deletedCount
    });
  } catch (error) {
    console.error('删除所有群聊错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/group-chats/:id
// @desc    删除群聊（只有系统管理员可以解散）
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const groupChat = await GroupChat.findById(req.params.id);

    if (!groupChat) {
      return res.status(404).json({ message: '群聊不存在' });
    }

    // 检查权限 - 只有超级管理员可以解散群聊
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '只有超级管理员可以解散群聊' });
    }

    await GroupChat.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '群聊已删除'
    });
  } catch (error) {
    console.error('删除群聊错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/group-chats/:id/members
// @desc    邀请用户加入群聊
// @access  Private
router.post('/:id/members', protect, async (req, res) => {
  try {
    const groupChat = await GroupChat.findById(req.params.id);

    if (!groupChat) {
      return res.status(404).json({ message: '群聊不存在' });
    }

    const { userIds } = req.body;

    // 检查权限 - 只有群聊管理员（owner 或 admin）可以添加成员
    if (!GroupChat.isAdmin(groupChat, req.user._id)) {
      return res.status(403).json({ message: '只有群主或管理员可以邀请成员' });
    }

    // 检查群聊人数上限
    const existingMembersCount = groupChat.members.length;
    const newMembersCount = userIds.filter(userId =>
      !groupChat.members.some(m => m.user.toString() === userId.toString())
    ).length;

    if (existingMembersCount + newMembersCount > groupChat.maxMembers) {
      return res.status(400).json({
        message: '群聊人数已满'
      });
    }

    const addedUsers = [];

    // 添加新成员并发送通知
    for (const userId of userIds) {
      const existingMember = groupChat.members.find(m =>
        m.user.toString() === userId.toString()
      );
      if (!existingMember) {
        groupChat.members.push({
          user: userId,
          role: 'member',
          joinedAt: new Date()
        });
        addedUsers.push(userId);
      }
    }

    await groupChat.save();
    await groupChat.populate('members.user', 'username avatar');

    // 为新加入的用户发送邀请通知
    for (const userId of addedUsers) {
      try {
        await Notification.create({
          recipient: userId,
          type: 'group_invite',
          title: '群聊邀请',
          content: `${req.user.username} 邀请你加入群聊「${groupChat.name}」`,
          data: {
            groupChatId: groupChat._id,
            groupChatName: groupChat.name,
            inviterId: req.user._id,
            inviterName: req.user.username
          }
        });
      } catch (notificationError) {
        console.error('发送群聊邀请通知错误:', notificationError);
      }
    }

    res.json({
      success: true,
      message: '成员已添加，邀请通知已发送',
      data: groupChat,
      addedCount: addedUsers.length
    });
  } catch (error) {
    console.error('添加群聊成员错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/group-chats/:id/members/:userId
// @desc    更新成员角色
// @access  Private
router.put('/:id/members/:userId', protect, async (req, res) => {
  try {
    const groupChat = await GroupChat.findById(req.params.id);

    if (!groupChat) {
      return res.status(404).json({ message: '群聊不存在' });
    }

    const { role, muted } = req.body;

    // 检查权限
    if (!GroupChat.isAdmin(groupChat, req.user._id) &&
        req.user.role !== 'admin' &&
        req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权修改成员权限' });
    }

    const memberIndex = groupChat.members.findIndex(m =>
      m.user.toString() === req.params.userId.toString()
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: '成员不存在' });
    }

    if (role !== undefined) {
      groupChat.members[memberIndex].role = role;
    }
    if (muted !== undefined) {
      groupChat.members[memberIndex].muted = muted;
    }

    await groupChat.save();
    await groupChat.populate('members.user', 'username avatar');

    res.json({
      success: true,
      message: '成员权限已更新',
      data: groupChat
    });
  } catch (error) {
    console.error('更新群聊成员权限错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/group-chats/:id/members/:userId
// @desc    移除成员
// @access  Private
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const groupChat = await GroupChat.findById(req.params.id);

    if (!groupChat) {
      return res.status(404).json({ message: '群聊不存在' });
    }

    // 检查权限
    if (req.params.userId.toString() !== req.user._id.toString() &&
        !GroupChat.isAdmin(groupChat, req.user._id) &&
        req.user.role !== 'admin' &&
        req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权移除该成员' });
    }

    const memberIndex = groupChat.members.findIndex(m =>
      m.user.toString() === req.params.userId.toString()
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: '成员不存在' });
    }

    // 如果移除的是群主，需要转移群主或解散群聊
    if (groupChat.members[memberIndex].role === 'owner') {
      // 如果是战队群聊，禁止移除群主
      if (groupChat.type === 'team') {
        return res.status(400).json({ 
          success: false,
          message: '战队群聊群主不可移除，请转让战队队长' 
        });
      }
      
      const otherAdmin = groupChat.members.find(m =>
        m.role === 'admin' && m.user.toString() !== req.params.userId.toString()
      );
      if (otherAdmin) {
        groupChat.members[groupChat.members.findIndex(m => m._id === otherAdmin._id)].role = 'owner';
        groupChat.creator = otherAdmin.user;
      } else {
        // 没有其他管理员，直接删除群聊
        await GroupChat.findByIdAndDelete(req.params.id);
        return res.json({
          success: true,
          message: '群聊已解散'
        });
      }
    }

    groupChat.members.splice(memberIndex, 1);
    await groupChat.save();
    await groupChat.populate('members.user', 'username avatar');

    res.json({
      success: true,
      message: '成员已移除',
      data: groupChat
    });
  } catch (error) {
    console.error('移除群聊成员错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/group-chats/:id/messages
// @desc    发送群聊消息
// @access  Private
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { content } = req.body;

    const groupChat = await GroupChat.findById(req.params.id);

    if (!groupChat) {
      return res.status(404).json({ message: '群聊不存在' });
    }

    // 检查是否是成员
    if (!GroupChat.isMember(groupChat, req.user._id)) {
      return res.status(403).json({ message: '您不是此群聊成员' });
    }

    // 检查是否被禁言
    if (GroupChat.isMuted(groupChat, req.user._id)) {
      return res.status(403).json({ message: '您已被禁言' });
    }

    const message = {
      sender: req.user._id,
      content,
      readBy: [req.user._id]
    };

    groupChat.messages.push(message);
    groupChat.lastMessage = message;
    await groupChat.save();

    await groupChat.populate('lastMessage.sender', 'username avatar');
    await groupChat.populate('messages.sender', 'username avatar');

    // 获取最新添加的消息
    const newMessage = groupChat.messages[groupChat.messages.length - 1];

    res.status(201).json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    console.error('发送群聊消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/group-chats/:id/messages
// @desc    获取群聊消息
// @access  Private
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const groupChat = await GroupChat.findById(req.params.id);

    if (!groupChat) {
      return res.status(404).json({ message: '群聊不存在' });
    }

    if (!GroupChat.isMember(groupChat, req.user._id) &&
        req.user.role !== 'admin' &&
        req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权访问此群聊' });
    }

    // 标记所有未读消息为已读
    const messagesToUpdate = groupChat.messages.filter(msg =>
      !msg.readBy.some(r => r.toString() === req.user._id.toString())
    );
    for (const msg of messagesToUpdate) {
      msg.readBy.push(req.user._id);
    }
    
    // 同时更新lastMessage（如果存在）
    if (groupChat.lastMessage && 
        !groupChat.lastMessage.readBy.some(r => r.toString() === req.user._id.toString())) {
      groupChat.lastMessage.readBy.push(req.user._id);
    }
    
    await groupChat.save();

    // 获取最新的消息（倒序）
    const messages = groupChat.messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit)
      .reverse();

    // 获取所有发送者ID
    const senderIds = [...new Set(messages.map(msg => msg.sender.toString()))];
    const senders = await User.find({ _id: { $in: senderIds } }).select('username avatar');
    const senderMap = new Map(senders.map(s => [s._id.toString(), s]));

    // 组合消息和发送者信息
    const messageWithSenders = messages.map(msg => {
      const sender = senderMap.get(msg.sender.toString()) || { username: '未知用户', avatar: '' };
      return {
        _id: msg._id,
        sender: {
          _id: msg.sender,
          username: sender.username,
          avatar: sender.avatar
        },
        content: msg.content,
        readBy: msg.readBy,
        createdAt: msg.createdAt
      };
    });

    const totalMessages = groupChat.messages.length;

    res.json({
      success: true,
      data: messageWithSenders,
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limit)
      }
    });
  } catch (error) {
    console.error('获取群聊消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/group-chats/level-config
// @desc    获取群聊等级配置
// @access  Public
router.get('/level-config', async (req, res) => {
  try {
    res.json({
      success: true,
      data: GROUP_LEVEL_CONFIG
    });
  } catch (error) {
    console.error('获取群聊等级配置错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/group-chats/read-all
// @desc    标记所有群聊消息为已读
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    // 获取用户所属的所有群聊
    const groupChats = await GroupChat.find({
      'members.user': req.user._id
    });

    // 遍历所有群聊，将用户未读的消息标记为已读
    for (const groupChat of groupChats) {
      // 更新所有消息
      for (const msg of groupChat.messages) {
        if (!msg.readBy.some(r => r.toString() === req.user._id.toString())) {
          msg.readBy.push(req.user._id);
        }
      }
      
      // 同时更新lastMessage（如果存在）
      if (groupChat.lastMessage && 
          !groupChat.lastMessage.readBy.some(r => r.toString() === req.user._id.toString())) {
        groupChat.lastMessage.readBy.push(req.user._id);
      }
      
      await groupChat.save();
    }

    res.json({
      success: true,
      message: '所有群聊消息已标记为已读'
    });
  } catch (error) {
    console.error('标记所有群聊消息已读错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
