const mongoose = require('mongoose');

const userInventorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, '数量是必填项'],
    min: [0, '数量不能为负数'],
    default: 0
  },
  value: {
    type: Number,
    min: [0, '价值不能为负数'],
    default: 0
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, '备注不能超过500个字符']
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

userInventorySchema.pre('save', function() {
  this.updatedAt = new Date();
});

userInventorySchema.index({ userId: 1 });
userInventorySchema.index({ inventoryItemId: 1 });
userInventorySchema.index({ userId: 1, inventoryItemId: 1 }, { unique: true });

module.exports = mongoose.model('UserInventory', userInventorySchema);