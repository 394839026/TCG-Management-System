const mongoose = require('mongoose');

// 群聊等级配置
const GROUP_LEVEL_CONFIG = {
  1: {
    name: '初级群',
    maxMembers: 50,
    icon: '🌱',
    description: '适合小型团队和朋友群'
  },
  2: {
    name: '中级群',
    maxMembers: 200,
    icon: '🌿',
    description: '适合中型团队和社区'
  },
  3: {
    name: '高级群',
    maxMembers: 500,
    icon: '🌳',
    description: '适合大型社区和组织'
  },
  4: {
    name: '超级群',
    maxMembers: 2000,
    icon: '🏰',
    description: '适合大型社群和官方组织'
  },
  5: {
    name: '顶级群',
    maxMembers: 10000,
    icon: '👑',
    description: '适合超大社群和平台级应用'
  }
};

// 获取等级配置
const getLevelConfig = (level) => {
  return GROUP_LEVEL_CONFIG[level] || GROUP_LEVEL_CONFIG[1];
};

// 群聊消息子文档
const groupMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '发送者是必填项']
  },
  content: {
    type: String,
    required: [true, '消息内容是必填项'],
    maxlength: [1000, '消息内容不能超过1000个字符'],
    trim: true
  },
  // 已读用户列表
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 群聊成员子文档
const groupMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '成员用户是必填项']
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  // 加入时间
  joinedAt: {
    type: Date,
    default: Date.now
  },
  // 被禁言标记
  muted: {
    type: Boolean,
    default: false
  }
});

// 群聊主文档
const groupChatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '群聊名称是必填项'],
    trim: true,
    minlength: [2, '群聊名称至少需要2个字符'],
    maxlength: [50, '群聊名称不能超过50个字符']
  },
  description: {
    type: String,
    maxlength: [500, '群聊描述不能超过500个字符'],
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  // 创建者
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '创建者是必填项']
  },
  // 成员列表
  members: [groupMemberSchema],
  // 最近一条消息
  lastMessage: {
    type: {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: {
        type: String,
        maxlength: [1000, '消息内容不能超过1000个字符'],
        trim: true
      },
      readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      createdAt: {
        type: Date,
        default: Date.now
      }
    },
    default: null
  },
  // 消息历史
  messages: [groupMessageSchema],
  // 群聊类型
  type: {
    type: String,
    enum: ['system', 'team', 'custom'],
    default: 'custom'
  },
  // 群聊等级
  level: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 1
  },
  // 群聊权限
  settings: {
    // 是否允许邀请
    allowInvite: { type: Boolean, default: true },
    // 是否允许发送图片
    allowImages: { type: Boolean, default: true },
    // 是否允许匿名
    allowAnonymous: { type: Boolean, default: false },
    // 是否允许成员修改昵称
    allowNicknameChange: { type: Boolean, default: true }
  },
  // 是否公开
  isPublic: {
    type: Boolean,
    default: false
  },
  // 最多成员数
  maxMembers: {
    type: Number,
    default: 100,
    min: 2,
    max: 10000
  },
  // 群聊过期时间（用于订单群聊自动删除）
  expiresAt: {
    type: Date
  },
  // 绑定的战队（仅战队群聊有）
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引优化
groupChatSchema.index({ creator: 1 });
groupChatSchema.index({ 'members.user': 1 });
groupChatSchema.index({ type: 1, isPublic: 1 });
groupChatSchema.index({ createdAt: -1 });
groupChatSchema.index({ updatedAt: -1 });
groupChatSchema.index({ expiresAt: 1 });
groupChatSchema.index({ team: 1 });

// 静态方法 - 检查用户是否是管理员
groupChatSchema.statics.isAdmin = function(group, userId) {
  const member = group.members.find(m => m.user.toString() === userId.toString());
  return member && (member.role === 'owner' || member.role === 'admin');
};

// 静态方法 - 检查用户是否是成员
groupChatSchema.statics.isMember = function(group, userId) {
  return group.members.some(m => m.user.toString() === userId.toString());
};

// 静态方法 - 检查用户是否被禁言
groupChatSchema.statics.isMuted = function(group, userId) {
  const member = group.members.find(m => m.user.toString() === userId.toString());
  return member && member.muted;
};

const GroupChat = mongoose.model('GroupChat', groupChatSchema);

module.exports = {
  GroupChat,
  GROUP_LEVEL_CONFIG,
  getLevelConfig
};
