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
      enum: ['leader', 'manager', 'member'], 
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
    returnDate: Date
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

// 自动更新updatedAt
teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Team', teamSchema);
