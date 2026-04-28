const mongoose = require('mongoose');

const tradeListingSchema = new mongoose.Schema({
  seller: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '卖家是必填项']
  },
  type: { 
    type: String, 
    enum: ['sell', 'buy', 'trade'], 
    required: [true, '交易类型是必填项']
  },
  items: [{
    item: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'InventoryItem',
      required: true
    },
    quantity: { 
      type: Number, 
      default: 1,
      min: [1, '数量至少为1']
    },
    condition: { 
      type: String,
      enum: ['mint', 'near_mint', 'excellent', 'good', 'fair', 'poor'],
      default: 'near_mint'
    }
  }],
  requestedItems: [{
    itemName: { 
      type: String, 
      required: [true, '物品名称是必填项'],
      trim: true
    },
    rarity: { 
      type: String,
      enum: ['common', 'uncommon', 'rare', 'super_rare', 'ultra_rare', 'secret_rare', 'other'],
      default: 'common'
    },
    quantity: { 
      type: Number, 
      default: 1,
      min: [1, '数量至少为1']
    }
  }],
  price: { 
    type: Number, 
    min: [0, '价格不能为负数'],
    default: 0
  },
  status: { 
    type: String, 
    enum: ['active', 'pending', 'completed', 'cancelled'], 
    default: 'active'
  },
  views: { 
    type: Number, 
    default: 0,
    min: [0, '浏览次数不能为负数']
  },
  interestedUsers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  expiresAt: { 
    type: Date 
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
tradeListingSchema.index({ seller: 1, status: 1 });
tradeListingSchema.index({ type: 1, status: 1 });
tradeListingSchema.index({ createdAt: -1 });

// 自动更新updatedAt
tradeListingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TradeListing', tradeListingSchema);
