const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemNo: {
    type: String,
    trim: true,
    index: true
  },
  itemName: {
    type: String,
    required: [true, '物品名称是必填项'],
    trim: true
  },
  itemCode: {
    type: String,
    trim: true,
    index: true
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'super_rare', 'ultra_rare', 'secret_rare', 'other'],
    default: 'common'
  },
  itemType: {
    type: String,
    enum: ['card', 'booster', 'box', 'accessory', 'other'],
    default: 'card'
  },
  quantity: {
    type: Number,
    required: [true, '数量是必填项'],
    min: [0, '数量不能为负数']
  },
  value: {
    type: Number,
    min: [0, '价值不能为负数'],
    default: 0
  },
  condition: {
    type: String,
    enum: ['mint', 'near_mint', 'excellent', 'good', 'fair', 'poor'],
    default: 'near_mint'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  tags: [{
    type: String,
    trim: true
  }],
  // 新增字段 - 图片和获取信息
  images: [{
    type: String
  }],
  acquisitionDate: {
    type: Date,
    default: Date.now
  },
  acquisitionPrice: {
    type: Number,
    min: [0, '购买价格不能为负数'],
    default: 0
  },
  acquisitionSource: {
    type: String,
    trim: true,
    default: ''
  },
  // 收藏和愿望单标记
  isFavorite: {
    type: Boolean,
    default: false
  },
  isWishlist: {
    type: Boolean,
    default: false
  },
  // 交易历史
  tradeHistory: [{
    type: { type: String, enum: ['buy', 'sell', 'trade'] },
    price: Number,
    date: { type: Date, default: Date.now },
    counterparty: String,
    notes: String
  }],
  // 卡牌特定信息
  setName: {
    type: String,
    trim: true,
    default: ''
  },
  setNumber: {
    type: String,
    trim: true,
    default: ''
  },
  language: {
    type: String,
    default: 'zh'
  },
  foil: {
    type: Boolean,
    default: false
  },
  graded: {
    company: { type: String, default: '' },
    grade: { type: String, default: '' },
    certificationNumber: { type: String, default: '' }
  },
  storageLocation: {
    type: String,
    trim: true,
    default: ''
  },
  // 所有权(用于转移历史)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// 更新时自动设置 updatedAt
inventoryItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引优化查询
inventoryItemSchema.index({ userId: 1 });
inventoryItemSchema.index({ userId: 1, itemType: 1 });
inventoryItemSchema.index({ itemName: 'text' });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
