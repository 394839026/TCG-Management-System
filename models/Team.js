const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, '战队名称是必填项'], 
    unique: true, 
    trim: true,
    minlength: [2, '战队名称至少需要2个字符'],
    maxlength: [50, '战队名称不能超过50个字符']
  },
  description: { 
    type: String, 
    maxlength: [500, '战队描述不能超过500个字符'],
    default: ''
  },
  logo: { 
    type: String, 
    default: '' 
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '战队所有者是必填项']
  },
  members: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    role: { 
      type: String, 
      enum: ['owner', 'leader', 'manager', 'member'], 
      default: 'member'
    },
    joinedAt: { 
      type: Date, 
      default: Date.now 
    },
    permissions: {
      canBorrowCards: { 
        type: Boolean, 
        default: false 
      },
      canBorrowDecks: { 
        type: Boolean, 
        default: false 
      },
      canManageInventory: { 
        type: Boolean, 
        default: false 
      }
    }
  }],
  sharedInventory: [{
    item: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'InventoryItem' 
    },
    addedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    addedAt: { 
      type: Date, 
      default: Date.now 
    },
    isAvailable: { 
      type: Boolean, 
      default: true 
    },
    borrowedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    borrowedAt: Date,
    returnDate: Date,
    quantity: { 
      type: Number, 
      default: 1 
    }
  }],
  sharedDecks: [{
    deck: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Deck' 
    },
    addedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isAvailable: { 
      type: Boolean, 
      default: true 
    },
    borrowedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    borrowedAt: Date,
    returnDate: Date
  }],
  deckBorrowRequests: [{
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: true
    },
    deckName: {
      type: String
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    handledDate: Date,
    returnDate: Date,
    note: {
      type: String,
      default: '',
      maxlength: [200, '备注不能超过200个字符']
    }
  }],
  deckBorrowRecords: [{
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: true
    },
    deckName: {
      type: String
    },
    borrowedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    borrowedAt: {
      type: Date,
      default: Date.now
    },
    returnedAt: Date,
    returnDate: Date,
    status: {
      type: String,
      enum: ['borrowed', 'returned'],
      default: 'borrowed'
    },
    note: {
      type: String,
      default: ''
    }
  }],
  // 捐赠申请
  donationRequests: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem'
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    quantity: {
      type: Number,
      default: 1
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    handledDate: Date
  }],
  // 签约选手列表（与普通队员区分，有签约费）
  signedPlayers: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    signingFee: {
      type: Number,
      default: 0,
      min: 0
    },
    signingDate: {
      type: Date,
      default: Date.now
    },
    contractStart: {
      type: Date
    },
    contractEnd: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated'],
      default: 'active'
    },
    contractDocument: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: '',
      maxlength: [500, '备注不能超过500个字符']
    },
    role: {
      type: String,
      enum: ['starter', 'reserve', 'coach', 'staff'],
      default: 'starter'
    },
    monthlySalary: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  // 赞助商列表
  sponsors: [{
    name: {
      type: String,
      required: [true, '赞助商名称是必填项']
    },
    logo: {
      type: String,
      default: ''
    },
    contactPerson: {
      type: String,
      default: ''
    },
    contactPhone: {
      type: String,
      default: ''
    },
    contactEmail: {
      type: String,
      default: ''
    },
    sponsorshipAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    sponsorshipType: {
      type: String,
      enum: ['cash', 'product', 'service', 'mixed'],
      default: 'cash'
    },
    contractStart: {
      type: Date
    },
    contractEnd: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated'],
      default: 'active'
    },
    contractDocument: {
      type: String,
      default: ''
    },
    benefits: {
      type: String,
      default: '',
      maxlength: [1000, '权益描述不能超过1000个字符']
    },
    notes: {
      type: String,
      default: '',
      maxlength: [500, '备注不能超过500个字符']
    },
    signedDate: {
      type: Date,
      default: Date.now
    }
  }],
  // 签约记录（所有签约操作的历史）
  signingRecords: [{
    type: {
      type: String,
      enum: ['player', 'sponsor'],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    targetName: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: ['sign', 'renew', 'terminate', 'expire'],
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      default: ''
    }
  }],
  investmentRecords: [{
    description: {
      type: String,
      required: [true, '投资描述是必填项']
    },
    amount: {
      type: Number,
      required: [true, '金额是必填项'],
      min: [0, '金额不能为负数']
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, '类型是必填项']
    },
    date: {
      type: Date,
      default: Date.now
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  donationRecords: [{
    type: {
      type: String,
      enum: ['points', 'item'],
      required: [true, '捐赠类型是必填项'],
      default: 'points'
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      min: [0, '金额不能为负数']
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem'
    },
    itemName: {
      type: String
    },
    quantity: {
      type: Number,
      min: [1, '数量至少为1'],
      default: 1
    },
    message: {
      type: String,
      default: '',
      maxlength: [200, '留言不能超过200个字符']
    },
    donatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  borrowRequests: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    itemName: {
      type: String
    },
    quantity: {
      type: Number,
      min: [1, '数量至少为1'],
      default: 1
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    handledDate: Date,
    returnDate: Date,
    note: {
      type: String,
      default: '',
      maxlength: [200, '备注不能超过200个字符']
    }
  }],
  borrowRecords: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    itemName: {
      type: String
    },
    quantity: {
      type: Number,
      min: [1, '数量至少为1'],
      default: 1
    },
    borrowedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    borrowedAt: {
      type: Date,
      default: Date.now
    },
    returnedAt: Date,
    returnDate: Date,
    status: {
      type: String,
      enum: ['borrowed', 'returned'],
      default: 'borrowed'
    },
    note: {
      type: String,
      default: ''
    }
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: true
    },
    allowJoinRequests: {
      type: Boolean,
      default: true
    }
  },
  // 签约统计
  signingStats: {
    totalSigningFees: {
      type: Number,
      default: 0
    },
    totalSponsorshipRevenue: {
      type: Number,
      default: 0
    },
    activePlayerCount: {
      type: Number,
      default: 0
    },
    activeSponsorCount: {
      type: Number,
      default: 0
    }
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  currentPoints: {
    type: Number,
    default: 0
  },
  fundPool: {
    type: Number,
    default: 0
  },
  // 关联的战队群聊
  groupChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 索引优化
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ name: 'text' });

// 更新时间戳
teamSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Team', teamSchema);
