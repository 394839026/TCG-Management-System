const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名是必填项'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名不能超过20个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必填项'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码至少需要6个字符']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, '个人简介不能超过500个字符'],
    default: ''
  },
  settings: {
    theme: {
      type: String,
      enum: ['default', 'dark', 'light', 'ocean', 'forest', 'sunset'],
      default: 'default'
    },
    primaryColor: {
      type: String,
      default: '#667eea'
    },
    cardView: {
      type: String,
      enum: ['card', 'list'],
      default: 'card'
    }
  },
  // 新增字段 - 用户类型
  userType: {
    type: String,
    enum: ['personal', 'team', 'shop'],
    default: 'personal'
  },
  // 关联的战队和店铺
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  shops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  }],
  // 好友列表
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // 愿望单
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem'
  }],
  // 登录历史
  lastLogin: Date,
  loginHistory: [{
    ip: String,
    userAgent: String,
    loginAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 设置settings的默认值
userSchema.pre('save', function(next) {
  if (!this.settings) {
    this.settings = {
      theme: 'default',
      primaryColor: '#667eea',
      cardView: 'card'
    };
  }
  next();
});

// 在保存前加密密码
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 比较密码方法
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
