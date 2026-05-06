const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '订购用户是必填项']
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, '店铺是必填项']
  },
  items: [{
    shopInventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShopInventoryItem',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, '数量至少为1']
    },
    price: {
      type: Number,
      required: true,
      min: [0, '价格不能为负数']
    },
    itemName: {
      type: String,
      required: true
    },
    itemSnapshot: {
      rarity: String,
      itemType: String,
      gameType: [String],
      images: [String],
      runeCardInfo: {
        version: String,
        cardNumber: String
      }
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: [0, '总金额不能为负数']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  groupChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat'
  },
  cancelReason: {
    type: String,
    default: ''
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  confirmedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ shop: 1, status: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
