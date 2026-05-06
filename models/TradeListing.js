const mongoose = require('mongoose');

const tradeListingSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: false,
    sparse: true
  },
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
      ref: 'Inventory',
      required: false,
      default: null
    },
    itemName: { 
      type: String, 
      trim: true 
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

// 生成订单号函数 - 改进版本
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${year}${month}${day}${hours}${minutes}${seconds}${ms}${random}`;
}

// 更新时间戳和生成订单号
tradeListingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }
  next();
});

module.exports = mongoose.model('TradeListing', tradeListingSchema);
