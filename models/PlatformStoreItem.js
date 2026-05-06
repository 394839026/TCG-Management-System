const mongoose = require('mongoose');

const platformStoreItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, '物品名称是必填项'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  itemType: {
    type: String,
    enum: ['inventory_item', 'points', 'exp', 'badge', 'title', 'other'],
    default: 'inventory_item'
  },
  // 兑换方式
  currencyType: {
    type: String,
    enum: ['points', 'coins'],
    default: 'points'
  },
  price: {
    type: Number,
    required: [true, '价格是必填项'],
    min: [0, '价格不能为负数']
  },
  // 关联的库存物品（如果 itemType 是 inventory_item）
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem'
  },
  // 库存限制
  stock: {
    type: Number,
    default: -1, // -1 表示无限库存
    min: -1
  },
  // 兑换获得的物品数量
  itemQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  // 已兑换数量
  redeemedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // 限购数量（每个用户）
  limitPerUser: {
    type: Number,
    default: -1, // -1 表示不限购
    min: -1
  },
  // 有效时间
  validFrom: {
    type: Date
  },
  validUntil: {
    type: Date
  },
  // 是否上架
  isActive: {
    type: Boolean,
    default: true
  },
  // 排序权重
  sortOrder: {
    type: Number,
    default: 0
  },
  // 图片
  image: {
    type: String,
    default: ''
  },
  // 标签
  tags: [{
    type: String,
    trim: true
  }],
  // 创建者
  createdBy: {
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

platformStoreItemSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// 检查物品是否在有效期内
platformStoreItemSchema.methods.isValid = function() {
  const now = new Date();
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  return true;
};

module.exports = mongoose.model('PlatformStoreItem', platformStoreItemSchema);
