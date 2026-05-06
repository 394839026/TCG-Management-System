const mongoose = require('mongoose');

const shopInventoryItemSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, '店铺是必填项']
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, '库存模板是必填项']
  },
  quantity: {
    type: Number,
    required: [true, '数量是必填项'],
    min: [0, '数量不能为负数'],
    default: 1
  },
  price: {
    type: Number,
    required: [true, '价格是必填项'],
    min: [0, '价格不能为负数'],
    default: 0
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '添加人是必填项']
  },
  source: {
    type: String,
    enum: ['personal_inventory', 'purchase', 'trade', 'other'],
    default: 'personal_inventory'
  },
  sourceNote: {
    type: String,
    default: ''
  },
  isListed: {
    type: Boolean,
    default: true
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
shopInventoryItemSchema.index({ shop: 1 });
shopInventoryItemSchema.index({ template: 1 });
shopInventoryItemSchema.index({ shop: 1, template: 1 }, { unique: true });

module.exports = mongoose.model('ShopInventoryItem', shopInventoryItemSchema);
