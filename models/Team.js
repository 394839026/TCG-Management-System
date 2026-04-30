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
    isAvailable: { 
      type: Boolean, 
      default: true 
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
