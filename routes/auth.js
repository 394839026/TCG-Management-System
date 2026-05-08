const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const { filterSensitiveFields, USER_PROFILE_ALLOWED, USER_SETTINGS_ALLOWED } = require('../utils/security');

// 生成JWT令牌
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

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

// @route   POST /api/auth/register
// @desc    用户注册
// @access  Public
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少为6个字符')
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // 检查用户是否已存在
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({
        message: user.email === email ? '该邮箱已被注册' : '该用户名已被使用'
      });
    }

    // 创建新用户
    user = await User.create({
      username,
      email,
      password
    });

    // 发送欢迎通知
    await sendNotification(
      user._id,
      'welcome',
      '🎉 欢迎加入！',
      `亲爱的 ${user.username}，欢迎来到星沉智库！开始探索你的卡牌收藏之旅吧！`,
      { username: user.username }
    );

    // 返回用户信息和token
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        role: user.role,
        level: user.level,
        exp: user.exp,
        points: user.points,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/auth/login
// @desc    用户登录
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').notEmpty().withMessage('请输入密码')
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 验证密码
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 返回用户信息和token
    res.json({
      success: true,
      data: {
        _id: user._id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        role: user.role,
        level: user.level,
        exp: user.exp,
        points: user.points,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/auth/me
// @desc    获取当前用户信息
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
        ...user.toObject(),
        level: user.level,
        exp: user.exp,
        points: user.points,
        expNeeded: expNeeded,
        expProgress: expProgress,
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

// @route   PUT /api/auth/profile
// @desc    更新用户个人资料
// @access  Private
router.put('/profile',
  protect,
  [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('用户名长度必须在3-20个字符之间'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('个人简介不能超过500个字符')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.user._id);
      
      // 只允许更新白名单中的字段
      const allowedData = filterSensitiveFields(req.body, USER_PROFILE_ALLOWED);
      
      Object.assign(user, allowedData);
      await user.save();

      res.json({
        success: true,
        message: '个人资料更新成功',
        data: {
          _id: user._id,
          uid: user.uid,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
          settings: user.settings
        }
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ message: '该邮箱已被使用' });
      }
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   PUT /api/auth/settings
// @desc    更新用户设置
// @access  Private
router.put('/settings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // 只允许更新白名单中的设置字段
    const allowedSettings = filterSensitiveFields(req.body, USER_SETTINGS_ALLOWED);
    
    Object.assign(user.settings, allowedSettings);
    await user.save();

    res.json({
      success: true,
      message: '设置更新成功',
      data: user.settings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/auth/users/:userId/profile
// @desc    获取用户公开资料
// @access  Private
router.get('/users/:userId/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        level: user.level,
        points: user.points,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/auth/admin/register
// @desc    管理员注册用户
// @access  Private (Admin only)
router.post('/admin/register',
  protect,
  authorize('admin', 'superadmin'),
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('用户名长度必须在3-20个字符之间'),
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码长度至少为6个字符'),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('无效的角色')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, role } = req.body;

      // 检查用户是否已存在
      let user = await User.findOne({ $or: [{ email }, { username }] });
      if (user) {
        return res.status(400).json({
          message: user.email === email ? '该邮箱已被注册' : '该用户名已被使用'
        });
      }

      // 创建新用户（普通管理员只能创建user角色）
      const newRole = req.user.role === 'superadmin' ? (role || 'user') : 'user';

      user = await User.create({
        username,
        email,
        password,
        role: newRole
      });

      // 返回用户信息（不包含token，由管理员决定后续操作）
      res.status(201).json({
        success: true,
        message: '用户创建成功',
        data: {
          _id: user._id,
          uid: user.uid,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   PUT /api/auth/users/:id/role
// @desc    修改用户角色（管理员和超级管理员）
// @access  Private (Admin & Superadmin)
router.put('/users/:id/role',
  protect,
  authorize('admin', 'superadmin'),
  [
    body('role')
      .isIn(['user', 'admin', 'superadmin'])
      .withMessage('无效的角色')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role } = req.body;
      const userId = req.params.id;

      // 查找用户
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      // 防止修改自己的角色（避免把自己降级）
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: '不能修改自己的角色' });
      }

      // 只有超级管理员可以创建/修改为超级管理员
      if (role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: '只有超级管理员可以设置超级管理员角色' });
      }

      // 只有超级管理员可以修改超级管理员的角色
      if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: '只有超级管理员可以修改超级管理员的角色' });
      }

      // 更新角色
      user.role = role;
      await user.save();

      res.json({
        success: true,
        message: '用户角色更新成功',
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   GET /api/auth/users
// @desc    获取所有用户列表（仅管理员和超级管理员）
// @access  Private (Admin & Superadmin)
router.get('/users',
  protect,
  authorize('admin', 'superadmin'),
  async (req, res) => {
    try {
      const users = await User.find().select('-password');
      
      res.json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   PUT /api/auth/users/:id/username
// @desc    修改用户用户名（仅超级管理员）
// @access  Private (Superadmin only)
router.put('/users/:id/username',
  protect,
  authorize('superadmin'),
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('用户名长度必须在3-20个字符之间')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username } = req.body;
      const userId = req.params.id;

      // 查找用户
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      // 检查用户名是否已被其他用户使用
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: '该用户名已被使用' });
      }

      // 更新用户名
      const oldUsername = user.username;
      user.username = username;
      await user.save();

      res.json({
        success: true,
        message: '用户名更新成功',
        data: {
          _id: user._id,
          username: user.username,
          oldUsername: oldUsername
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   DELETE /api/auth/users/:id
// @desc    删除用户（仅超级管理员）
// @access  Private (Superadmin only)
router.delete('/users/:id',
  protect,
  authorize('superadmin'),
  async (req, res) => {
    try {
      const userId = req.params.id;

      // 防止删除自己
      if (userId === req.user._id.toString()) {
        return res.status(400).json({ message: '不能删除自己的账户' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      await User.findByIdAndDelete(userId);

      res.json({
        success: true,
        message: '用户已删除'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

// @route   PUT /api/auth/change-password
// @desc    修改密码
// @access  Private
router.put('/change-password',
  protect,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('请输入当前密码'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('新密码长度至少为6个字符')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // 查找用户
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      // 验证当前密码
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: '当前密码错误' });
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      // 发送通知
      await sendNotification(
        user._id,
        'system',
        '🔐 密码已修改',
        '您的账户密码已成功修改。如非本人操作，请立即联系管理员。'
      );

      res.json({
        success: true,
        message: '密码修改成功'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  }
);

module.exports = router;
