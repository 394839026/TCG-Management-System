// 用户数据模型 - 定义TCG卡牌管理系统的用户结构
// 包含认证信息、个人资料、等级系统、权限控制等

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 用户Schema定义
const userSchema = new mongoose.Schema({
  // 用户唯一标识 - 格式: TCG+年份后两位+4位序号
  uid: {
    type: String,
    unique: true,
    required: true,
    immutable: true,
    default: function() {
      return `TCG${new Date().getFullYear().toString().slice(-2)}${String(Math.floor(Math.random() * 9000) + 1000)}`;
    }
  },
  // 用户名
  username: {
    type: String,
    required: [true, '用户名是必填项'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名不能超过20个字符']
  },
  // 邮箱
  email: {
    type: String,
    required: [true, '邮箱是必填项'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  // 密码 - 会被bcrypt加密
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码至少需要6个字符']
  },
  // 用户角色 - 普通用户、管理员、超级管理员
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  // 用户头像
  avatar: {
    type: String,
    default: ''
  },
  // 个人简介
  bio: {
    type: String,
    maxlength: [500, '个人简介不能超过500个字符'],
    default: ''
  },
  // 用户设置
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
  // 用户类型 - 个人用户、战队、店铺
  userType: {
    type: String,
    enum: ['personal', 'team', 'shop'],
    default: 'personal'
  },
  // 关联的战队列表
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  // 关联的店铺列表
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
  // 页面访问权限控制
  permissions: {
    teams: { type: Boolean, default: true },
    shops: { type: Boolean, default: true },
    decks: { type: Boolean, default: true },
    inventory: { type: Boolean, default: true },
    marketplace: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    friends: { type: Boolean, default: true },
    favorites: { type: Boolean, default: true },
  },
  // 登录历史记录
  lastLogin: Date,
  loginHistory: [{
    ip: String,
    userAgent: String,
    loginAt: { type: Date, default: Date.now }
  }],
  // 等级系统 - 最高100级
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  },
  // 经验值
  exp: {
    type: Number,
    default: 0,
    min: 0
  },
  // 积分
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  // 星币
  coins: {
    type: Number,
    default: 0,
    min: 0
  },
  // 每日经验领取记录
  lastDailyExpGrant: String,
  // 签到系统
  lastCheckInDate: String,
  totalCheckIns: {
    type: Number,
    default: 0,
    min: 0
  },
  // 每日礼物领取记录
  lastGiftDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动添加createdAt和updatedAt字段
});

// 保存前自动生成UID（支持新用户和已有用户）
userSchema.pre('save', async function() {
  if (!this.uid) {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const lastUser = await User.findOne({}, {}, { sort: { createdAt: -1 } });
    
    let sequence = 1;
    if (lastUser && lastUser.uid) {
      const lastUid = lastUser.uid;
      const lastSequence = parseInt(lastUid.slice(-4));
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    this.uid = `TCG${currentYear}${String(sequence).padStart(4, '0')}`;
  }
});

// 保存前设置settings的默认值
userSchema.pre('save', function() {
  if (!this.settings) {
    this.settings = {
      theme: 'default',
      primaryColor: '#667eea',
      cardView: 'card'
    };
  }
});

// 保存前自动加密密码
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 密码验证方法
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 计算当前等级升级所需经验值
userSchema.methods.getExpForNextLevel = function() {
  // 每级固定需要100经验值，上限100级
  if (this.level >= 100) return Infinity;
  return 100;
};

// 获取当前等级经验值进度百分比
userSchema.methods.getExpProgress = function() {
  const expNeeded = this.getExpForNextLevel();
  if (expNeeded === Infinity) return 100;
  return Math.min(100, Math.floor((this.exp / expNeeded) * 100));
};

// 添加经验值并自动升级
userSchema.methods.addExp = async function(amount) {
  if (amount <= 0 || this.level >= 100) return { levelUp: false, newLevel: this.level };

  this.exp += amount;
  let levelUp = false;
  let newLevel = this.level;

  // 检查是否升级，上限100级
  while (this.exp >= this.getExpForNextLevel() && this.level < 100) {
    this.exp -= this.getExpForNextLevel();
    this.level += 1;
    levelUp = true;
    newLevel = this.level;
  }

  await this.save();
  return { levelUp, newLevel, exp: this.exp };
};

// 添加积分
userSchema.methods.addPoints = async function(amount) {
  if (amount <= 0) return false;
  this.points += amount;
  await this.save();
  return true;
};

// 添加星币
userSchema.methods.addCoins = async function(amount) {
  if (amount <= 0) return false;
  this.coins += amount;
  await this.save();
  return true;
};

// 扣除积分
userSchema.methods.removePoints = async function(amount) {
  if (amount <= 0 || this.points < amount) return false;
  this.points -= amount;
  await this.save();
  return true;
};

// 静态方法：计算指定等级所需经验
userSchema.statics.getExpForLevel = function(level) {
  if (level >= 100) return Infinity;
  return 100;
};

// 检查是否可以签到
userSchema.methods.canCheckIn = function() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = today.toDateString();
  
  if (!this.lastCheckInDate) return true;
  
  const lastCheckIn = new Date(this.lastCheckInDate);
  lastCheckIn.setHours(12, 0, 0, 0);
  
  return lastCheckIn.toDateString() !== todayStr;
};

// 执行签到
userSchema.methods.checkIn = async function() {
  console.log('📅 checkIn方法被调用，当前状态:', {
    canCheckIn: this.canCheckIn(),
    lastCheckInDate: this.lastCheckInDate,
    totalCheckIns: this.totalCheckIns
  });
  
  if (!this.canCheckIn()) {
    return { success: false, message: '今天已经签到过了' };
  }
  
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  this.lastCheckInDate = today.toDateString();
  this.totalCheckIns = (this.totalCheckIns || 0) + 1;
  
  console.log('📝 准备添加经验值，修改后:', {
    lastCheckInDate: this.lastCheckInDate,
    totalCheckIns: this.totalCheckIns
  });
  
  const result = await this.addExp(1);
  
  console.log('✅ 经验值添加完成，结果:', result);
  
  return {
    success: true,
    message: '签到成功！获得1经验值',
    expGained: 1,
    totalCheckIns: this.totalCheckIns,
    ...result
  };
};

// 导出用户模型
module.exports = mongoose.model('User', userSchema);
