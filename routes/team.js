const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Team = require('../models/Team');
const User = require('../models/User');
const TeamJoinRequest = require('../models/TeamJoinRequest');
const TeamInvite = require('../models/TeamInvite');
const Notification = require('../models/Notification');
const { body, validationResult } = require('express-validator');

// @route   POST /api/teams
// @desc    创建战队
// @access  Private (personal用户)
router.post('/', protect, [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('战队名称需要2-50个字符'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述不能超过500个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, logo } = req.body;

    // 检查战队名称是否已存在
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      return res.status(400).json({ message: '战队名称已被使用' });
    }

    const team = new Team({
      name,
      description,
      logo,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner',
        permissions: {
          canBorrowCards: true,
          canBorrowDecks: true,
          canManageInventory: true
        }
      }]
    });

    await team.save();

    // 更新用户的teams数组
    await User.findByIdAndUpdate(req.user._id, {
      $push: { teams: team._id }
    });

    res.status(201).json({
      success: true,
      message: '战队创建成功',
      data: team
    });
  } catch (error) {
    console.error('创建战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/my-invites
// @desc    获取我的收到的邀请
// @access  Private
router.get('/my-invites', protect, async (req, res) => {
  try {
    const invites = await TeamInvite.find({
      invitedUser: req.user._id,
      status: 'pending'
    })
      .populate('team', 'name')
      .populate('invitedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invites
    });
  } catch (error) {
    console.error('获取我的邀请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams
// @desc    获取战队列表(支持搜索/分页)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search ? {
      $or: [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ]
    } : {};

    const filter = req.query.isPublic !== undefined ? {
      ...searchQuery,
      'settings.isPublic': req.query.isPublic === 'true'
    } : searchQuery;

    const teams = await Team.find(filter)
      .populate('owner', 'username avatar')
      .select('-sharedInventory -sharedDecks -investmentRecords')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Team.countDocuments(filter);

    res.json({
      success: true,
      count: teams.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: teams
    });
  } catch (error) {
    console.error('获取战队列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id
// @desc    获取战队详情
// @access  Public (公开战队) / Private (成员)
router.get('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'username avatar email')
      .populate('members.user', 'username avatar')
      .populate('sharedInventory.item')
      .populate('sharedDecks.deck');

    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查访问权限
    if (!team.settings.isPublic) {
      const isMember = team.members.some(m => m.user._id.toString() === req.user._id.toString());
      const isOwner = team.owner._id.toString() === req.user._id.toString();
      
      if (!isMember && !isOwner && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: '您不是该战队成员' });
      }
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('获取战队详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id
// @desc    更新战队信息
// @access  Private (owner/manager with ABAC)
router.put('/:id', protect, abac({ resource: 'team', actions: ['write'] }), async (req, res) => {
  try {
    const { name, description, logo, settings } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 更新字段
    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (logo !== undefined) team.logo = logo;
    if (settings) team.settings = { ...team.settings, ...settings };

    await team.save();

    res.json({
      success: true,
      message: '战队信息更新成功',
      data: team
    });
  } catch (error) {
    console.error('更新战队错误:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '战队名称已被使用' });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/teams/:id
// @desc    解散战队
// @access  Private (仅owner)
router.delete('/:id', protect, abac({ resource: 'team', actions: ['delete'] }), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 移除所有成员的teams引用
    await User.updateMany(
      { _id: { $in: team.members.map(m => m.user) } },
      { $pull: { teams: team._id } }
    );

    await team.deleteOne();

    res.json({
      success: true,
      message: '战队已解散'
    });
  } catch (error) {
    console.error('解散战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/teams/:id/members
// @desc    申请加入战队
// @access  Private
router.post('/:id/members', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否已是成员
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (isMember) {
      return res.status(400).json({ message: '您已经是该战队成员' });
    }

    // 检查是否已有待处理的申请，如果有则返回错误
    const existingRequest = await TeamJoinRequest.findOne({
      team: team._id,
      user: req.user._id,
      status: 'pending'
    });
    if (existingRequest) {
      return res.status(400).json({ message: '您已有待处理的申请' });
    }

    // 删除该用户之前的申请记录（已拒绝或已过期的）
    await TeamJoinRequest.deleteMany({
      team: team._id,
      user: req.user._id
    });

    // 检查是否允许加入
    if (!team.settings.allowJoinRequests) {
      return res.status(400).json({ message: '该战队暂不接受加入申请' });
    }

    // 创建申请
    const request = new TeamJoinRequest({
      team: team._id,
      user: req.user._id,
      message: req.body.message || '',
      status: 'pending'
    });

    await request.save();

    // 向队长发送通知
    const teamOwner = await User.findById(team.owner);
    if (teamOwner && teamOwner._id.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: team.owner,
        type: 'system',
        title: '新的战队申请',
        content: `用户 ${req.user.username} 申请加入战队「${team.name}」`,
        relatedId: team._id,
      });
      await notification.save();
    }

    res.status(201).json({
      success: true,
      message: '申请已提交，等待队长审核',
      data: request
    });
  } catch (error) {
    console.error('申请加入战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id/members/requests
// @desc    获取战队的加入申请列表
// @access  Private (队长/管理员)
router.get('/:id/members/requests', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是队长或管理员
    const isOwner = team.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '只有队长或管理员可以查看申请列表' });
    }

    const requests = await TeamJoinRequest.find({
      team: team._id,
      status: 'pending'
    }).populate('user', 'username avatar email').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('获取申请列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/members/requests/:requestId
// @desc    批准或拒绝加入申请
// @access  Private (队长/管理员)
router.put('/:id/members/requests/:requestId', protect, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' 或 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '无效的操作' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是队长或管理员
    const isOwner = team.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '只有队长或管理员可以处理申请' });
    }

    const request = await TeamJoinRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: '申请不存在' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: '该申请已被处理' });
    }

    if (action === 'approve') {
      // 批准申请 - 添加为成员
      team.members.push({
        user: request.user,
        role: 'member',
        permissions: {
          canBorrowCards: false,
          canBorrowDecks: false,
          canManageInventory: false
        }
      });
      await team.save();

      // 更新用户的teams数组
      await User.findByIdAndUpdate(request.user, {
        $push: { teams: team._id }
      });

      // 发送通知给申请人
      const notification = new Notification({
        recipient: request.user,
        type: 'system',
        title: '战队申请已批准',
        content: `你的加入战队「${team.name}」申请已通过！`,
        relatedId: team._id,
      });
      await notification.save();

      request.status = 'approved';
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();

      res.json({
        success: true,
        message: '已批准申请'
      });
    } else {
      // 拒绝申请
      request.status = 'rejected';
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();

      // 发送通知给申请人
      const notification = new Notification({
        recipient: request.user,
        type: 'system',
        title: '战队申请被拒绝',
        content: `你的加入战队「${team.name}」申请被拒绝`,
        relatedId: team._id,
      });
      await notification.save();

      res.json({
        success: true,
        message: '已拒绝申请'
      });
    }
  } catch (error) {
    console.error('处理申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/teams/:id/invite
// @desc    发送邀请
// @access  Private (队长/管理员)
router.post('/:id/invite', protect, async (req, res) => {
  try {
    const { identifier, message } = req.body; // identifier 可以是邮箱或用户ID

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是队长或管理员
    const isOwner = team.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '只有队长或管理员可以发送邀请' });
    }

    // 查找用户 - 支持邮箱、UID、用户ID或用户名
    let invitedUser = null;
    if (identifier.includes('@')) {
      // 邮箱
      invitedUser = await User.findOne({ email: identifier });
    } else if (identifier.match(/^TCG\d+$/)) {
      // UID 格式，如 TCG263539
      invitedUser = await User.findOne({ uid: identifier });
    } else if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      // 有效的 ObjectId 格式
      invitedUser = await User.findById(identifier);
    } else {
      // 假设是用户名
      invitedUser = await User.findOne({ username: identifier });
    }

    if (!invitedUser) {
      return res.status(404).json({ message: '未找到该用户' });
    }

    // 检查是否已是成员
    const isMember = team.members.some(m => m.user.toString() === invitedUser._id.toString());
    if (isMember) {
      return res.status(400).json({ message: '该用户已是战队成员' });
    }

    // 检查是否已有待处理的邀请
    const existingInvite = await TeamInvite.findOne({
      team: team._id,
      invitedUser: invitedUser._id,
      status: 'pending'
    });
    if (existingInvite) {
      return res.status(400).json({ message: '该用户已有待处理的邀请' });
    }

    // 创建邀请
    const invite = new TeamInvite({
      team: team._id,
      invitedBy: req.user._id,
      invitedUser: invitedUser._id,
      message: message || '',
      status: 'pending'
    });

    await invite.save();

    // 发送通知给被邀请的用户
    const notification = new Notification({
      recipient: invitedUser._id,
      type: 'system',
      title: '战队邀请',
      content: `你收到了来自战队「${team.name}」的邀请`,
      relatedId: team._id,
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: '邀请已发送',
      data: invite
    });
  } catch (error) {
    console.error('发送邀请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id/invites
// @desc    获取战队的邀请列表
// @access  Private (队长/管理员)
router.get('/:id/invites', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是队长或管理员
    const isOwner = team.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '只有队长或管理员可以查看邀请列表' });
    }

    const invites = await TeamInvite.find({
      team: team._id
    })
      .populate('invitedUser', 'username avatar email')
      .populate('invitedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invites
    });
  } catch (error) {
    console.error('获取邀请列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/invites/:inviteId/accept
// @desc    接受邀请
// @access  Private
router.put('/invites/:inviteId/accept', protect, async (req, res) => {
  try {
    const invite = await TeamInvite.findById(req.params.inviteId);
    if (!invite) {
      return res.status(404).json({ message: '邀请不存在' });
    }

    if (invite.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '这不是你的邀请' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ message: '该邀请已被处理' });
    }

    const team = await Team.findById(invite.team);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 添加为成员
    team.members.push({
      user: req.user._id,
      role: 'member',
      permissions: {
        canBorrowCards: false,
        canBorrowDecks: false,
        canManageInventory: false
      }
    });
    await team.save();

    // 更新用户的teams数组
    await User.findByIdAndUpdate(req.user._id, {
      $push: { teams: team._id }
    });

    // 更新邀请状态
    invite.status = 'accepted';
    await invite.save();

    // 发送通知给邀请人
    const notification = new Notification({
      recipient: invite.invitedBy,
      type: 'system',
      title: '邀请已被接受',
      content: `${req.user.username} 已接受你的邀请，加入了战队「${team.name}」`,
      relatedId: team._id,
    });
    await notification.save();

    res.json({
      success: true,
      message: '已接受邀请'
    });
  } catch (error) {
    console.error('接受邀请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/invites/:inviteId/reject
// @desc    拒绝邀请
// @access  Private
router.put('/invites/:inviteId/reject', protect, async (req, res) => {
  try {
    const invite = await TeamInvite.findById(req.params.inviteId);
    if (!invite) {
      return res.status(404).json({ message: '邀请不存在' });
    }

    if (invite.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '这不是你的邀请' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ message: '该邀请已被处理' });
    }

    const team = await Team.findById(invite.team);

    // 更新邀请状态
    invite.status = 'rejected';
    await invite.save();

    // 发送通知给邀请人
    if (team) {
      const notification = new Notification({
        recipient: invite.invitedBy,
        type: 'system',
        title: '邀请被拒绝',
        content: `${req.user.username} 拒绝了你的邀请，不想加入战队「${team.name}」`,
        relatedId: team._id,
      });
      await notification.save();
    }

    res.json({
      success: true,
      message: '已拒绝邀请'
    });
  } catch (error) {
    console.error('拒绝邀请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/members/:userId/role
// @desc    修改成员角色
// @access  Private (仅owner)
router.put('/:id/members/:userId/role', protect, abac({ resource: 'team', actions: ['manage'] }), async (req, res) => {
  try {
    const { role } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const member = team.members.find(m => m.user.toString() === req.params.userId);
    if (!member) {
      return res.status(404).json({ message: '成员不存在' });
    }

    member.role = role;
    await team.save();

    res.json({
      success: true,
      message: '成员角色已更新',
      data: team
    });
  } catch (error) {
    console.error('修改成员角色错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/transfer-leader
// @desc    转让队长身份
// @access  Private (仅队长)
router.put('/:id/transfer-leader', protect, async (req, res) => {
  try {
    const { newLeaderId } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是队长
    if (team.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '只有队长可以转让队长身份' });
    }

    // 检查新队长是否是成员
    const newLeader = team.members.find(m => m.user.toString() === newLeaderId);
    if (!newLeader) {
      return res.status(404).json({ message: '该用户不是战队成员' });
    }

    // 不能转让给自己
    if (newLeaderId === req.user._id.toString()) {
      return res.status(400).json({ message: '不能转让给自己' });
    }

    // 更新旧队长的角色为 member
    const oldLeader = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (oldLeader) {
      oldLeader.role = 'member';
    }

    // 更新新队长的角色为 owner
    newLeader.role = 'owner';

    // 更新 owner 字段
    team.owner = newLeaderId;

    await team.save();

    // 发送通知给新队长
    const notification = new Notification({
      recipient: newLeaderId,
      type: 'system',
      title: '成为新队长',
      content: `你已成为战队「${team.name}」的新队长`,
      relatedId: team._id,
    });
    await notification.save();

    res.json({
      success: true,
      message: '已转让队长身份'
    });
  } catch (error) {
    console.error('转让队长错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/teams/:id/members/me
// @desc    成员退出战队
// @access  Private
router.delete('/:id/members/me', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是成员
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 检查是否是队长
    if (team.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: '队长不能退出战队，请先转让队长身份' });
    }

    // 移除成员
    team.members = team.members.filter(m => m.user.toString() !== req.user._id.toString());
    await team.save();

    // 更新用户的teams数组
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { teams: team._id }
    });

    // 删除该用户的加入申请记录
    await TeamJoinRequest.deleteMany({
      team: team._id,
      user: req.user._id
    });

    // 删除该用户的邀请记录
    await TeamInvite.deleteMany({
      team: team._id,
      invitedUser: req.user._id
    });

    res.json({
      success: true,
      message: '已退出战队'
    });
  } catch (error) {
    console.error('退出战队错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/teams/:id/members/:userId
// @desc    移除成员
// @access  Private (owner)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const isOwner = team.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: '只有队长可以移除成员' });
    }

    // 不能移除队长自己
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: '不能移除自己，请转让队长身份或退出战队' });
    }

    team.members = team.members.filter(m => m.user.toString() !== req.params.userId);
    await team.save();

    // 更新用户的teams数组
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { teams: team._id }
    });

    // 删除该用户的加入申请记录
    await TeamJoinRequest.deleteMany({
      team: team._id,
      user: req.params.userId
    });

    // 删除该用户的邀请记录
    await TeamInvite.deleteMany({
      team: team._id,
      invitedUser: req.params.userId
    });

    res.json({
      success: true,
      message: '成员已移除'
    });
  } catch (error) {
    console.error('移除成员错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/members/:userId/permissions
// @desc    设置成员权限
// @access  Private (仅owner)
router.put('/:id/members/:userId/permissions', protect, abac({ resource: 'team', actions: ['manage'] }), async (req, res) => {
  try {
    const { permissions } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const member = team.members.find(m => m.user.toString() === req.params.userId);
    if (!member) {
      return res.status(404).json({ message: '成员不存在' });
    }

    member.permissions = { ...member.permissions, ...permissions };
    await team.save();

    res.json({
      success: true,
      message: '成员权限已更新',
      data: team
    });
  } catch (error) {
    console.error('设置成员权限错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/teams/:id/shared-inventory
// @desc    添加物品到共享库存
// @access  Private (成员with permission)
router.post('/:id/shared-inventory', protect, abac({ resource: 'team', actions: ['write'] }), async (req, res) => {
  try {
    const { itemId } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否已在共享库存中
    const alreadyShared = team.sharedInventory.some(si => si.item.toString() === itemId);
    if (alreadyShared) {
      return res.status(400).json({ message: '该物品已在共享库存中' });
    }

    team.sharedInventory.push({
      item: itemId,
      addedBy: req.user._id,
      isAvailable: true
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: '物品已添加到共享库存',
      data: team
    });
  } catch (error) {
    console.error('添加共享物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/shared-inventory/:itemId/borrow
// @desc    借用物品
// @access  Private (成员with permission)
router.put('/:id/shared-inventory/:itemId/borrow', protect, abac({ resource: 'team', actions: ['write'] }), async (req, res) => {
  try {
    const { returnDate } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const sharedItem = team.sharedInventory.find(si => si._id.toString() === req.params.itemId);
    if (!sharedItem) {
      return res.status(404).json({ message: '共享物品不存在' });
    }

    if (!sharedItem.isAvailable) {
      return res.status(400).json({ message: '该物品已被借出' });
    }

    sharedItem.isAvailable = false;
    sharedItem.borrowedBy = req.user._id;
    sharedItem.borrowedAt = Date.now();
    sharedItem.returnDate = returnDate || null;

    await team.save();

    res.json({
      success: true,
      message: '物品借用成功',
      data: team
    });
  } catch (error) {
    console.error('借用物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/teams/:id/shared-inventory/:itemId/return
// @desc    归还物品
// @access  Private (borrower或owner)
router.put('/:id/shared-inventory/:itemId/return', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const sharedItem = team.sharedInventory.find(si => si._id.toString() === req.params.itemId);
    if (!sharedItem) {
      return res.status(404).json({ message: '共享物品不存在' });
    }

    const isBorrower = sharedItem.borrowedBy.toString() === req.user._id.toString();
    const isOwner = team.owner.toString() === req.user._id.toString();

    if (!isBorrower && !isOwner) {
      return res.status(403).json({ message: '您没有权限归还此物品' });
    }

    sharedItem.isAvailable = true;
    sharedItem.borrowedBy = undefined;
    sharedItem.borrowedAt = undefined;
    sharedItem.returnDate = undefined;

    await team.save();

    res.json({
      success: true,
      message: '物品归还成功',
      data: team
    });
  } catch (error) {
    console.error('归还物品错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/teams/:id/investments
// @desc    记录投资收支
// @access  Private (owner/manager)
router.post('/:id/investments', protect, abac({ resource: 'team', actions: ['write'] }), [
  body('description').trim().notEmpty().withMessage('描述不能为空'),
  body('amount').isNumeric().withMessage('金额必须是数字'),
  body('type').isIn(['income', 'expense']).withMessage('类型必须是income或expense')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, amount, type, date } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 更新战队资金池余额
    if (type === 'income') {
      team.fundPool = (team.fundPool || 0) + amount;
    } else {
      team.fundPool = Math.max(0, (team.fundPool || 0) - amount);
    }

    team.investmentRecords.push({
      description,
      amount,
      type,
      date: date || Date.now(),
      recordedBy: req.user._id
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: '投资记录已添加',
      data: team
    });
  } catch (error) {
    console.error('添加投资记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id/investments
// @desc    获取投资记录
// @access  Private (成员)
router.get('/:id/investments', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是成员
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    const isOwner = team.owner.toString() === req.user._id.toString();

    if (!isMember && !isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 填充recordedBy的用户信息
    const enrichedRecords = await Promise.all(
      team.investmentRecords.map(async (record) => {
        // 确保record是对象
        const recordObj = record.toObject ? record.toObject() : record;
        try {
          if (recordObj.recordedBy) {
            const recordedByUser = await User.findById(recordObj.recordedBy).select('username');
            return {
              ...recordObj,
              recordedBy: recordedByUser ? { _id: recordedByUser._id, username: recordedByUser.username } : recordObj.recordedBy
            };
          }
          return recordObj;
        } catch (err) {
          console.error('获取记录人信息错误:', err);
          return recordObj;
        }
      })
    );

    res.json({
      success: true,
      data: enrichedRecords
    });
  } catch (error) {
    console.error('获取投资记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/teams/:id/donate
// @desc    用户向战队捐赠积分
// @access  Private (成员)
router.post('/:id/donate', protect, [
  body('amount').isInt({ min: 1 }).withMessage('捐赠金额至少为1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, message } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是成员
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    const isOwner = team.owner.toString() === req.user._id.toString();

    if (!isMember && !isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 检查用户积分是否足够
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (user.points < amount) {
      return res.status(400).json({ message: '积分不足' });
    }

    // 扣除用户积分
    user.points -= amount;
    await user.save();

    // 增加战队积分
    team.currentPoints += amount;
    team.totalPoints += amount;

    // 添加捐赠记录
    team.donationRecords.push({
      type: 'points',
      donor: req.user._id,
      amount,
      message: message || '',
      donatedAt: Date.now()
    });

    await team.save();

    // 发送通知给队长
    if (team.owner.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: team.owner,
        type: 'system',
        title: '战队收到捐赠',
        content: `${user.username}向战队「${team.name}」捐赠了${amount}积分`,
        relatedId: team._id,
      });
      await notification.save();
    }

    res.status(201).json({
      success: true,
      message: '捐赠成功',
      data: {
        userPoints: user.points,
        teamCurrentPoints: team.currentPoints,
        teamTotalPoints: team.totalPoints
      }
    });
  } catch (error) {
    console.error('捐赠积分错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id/donations
// @desc    获取战队捐赠记录
// @access  Private (成员)
router.get('/:id/donations', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('donationRecords.donor', 'username avatar')
      .populate('donationRecords.item', 'name');
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    // 检查是否是成员
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    const isOwner = team.owner.toString() === req.user._id.toString();

    if (!isMember && !isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 确保 donationRecords 存在
    const donations = team.donationRecords || [];
    
    // 按时间倒序排列
    const sortedDonations = [...donations].sort((a, b) => 
      new Date(b.donatedAt).getTime() - new Date(a.donatedAt).getTime()
    );

    res.json({
      success: true,
      data: sortedDonations
    });
  } catch (error) {
    console.error('获取捐赠记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/teams/:id/financial-summary
// @desc    获取财务摘要
// @access  Private (owner/manager)
router.get('/:id/financial-summary', protect, abac({ resource: 'team', actions: ['read'] }), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const income = team.investmentRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const expense = team.investmentRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    res.json({
      success: true,
      data: {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        recordCount: team.investmentRecords.length
      }
    });
  } catch (error) {
    console.error('获取财务摘要错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
