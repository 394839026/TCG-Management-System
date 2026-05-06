// 库存物品数据模型 - 定义TCG卡牌管理系统的库存物品结构
// 支持个人库存、全局模板、商店库存等多种场景

const mongoose = require('mongoose');

// 库存物品Schema定义
const inventoryItemSchema = new mongoose.Schema({
  // 用户ID - 关联所属用户，改为可选以支持全局模板
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  // 是否为全局模板
  isTemplate: {
    type: Boolean,
    default: false
  },
  // 物品编号
  itemNo: {
    type: String,
    trim: true,
    index: true
  },
  // 物品名称
  itemName: {
    type: String,
    required: [true, '物品名称是必填项'],
    trim: true
  },
  // 物品代码
  itemCode: {
    type: String,
    trim: true,
    index: true
  },
  // 稀有度 - 支持多种稀有度标准
  rarity: {
    type: String,
    enum: ['N', 'N_FOIL', 'U', 'U_FOIL', 'R', 'E', 'AA', 'AA_SIGN', 'AA_ULTIMATE', 'common', 'uncommon', 'rare', 'super_rare', 'ultra_rare', 'secret_rare', 'other'],
    default: 'N'
  },
  // 游戏类型 - 支持多种卡牌游戏
  gameType: {
    type: [String],
    enum: ['rune', 'digimon', 'pokemon', 'shadowverse-evolve'],
    default: []
  },
  // 物品类型 - 默认为卡牌
  itemType: {
    type: String,
    default: 'card'
  },
  // 数量
  quantity: {
    type: Number,
    required: [true, '数量是必填项'],
    min: [0, '数量不能为负数']
  },
  // 价值
  value: {
    type: Number,
    min: [0, '价值不能为负数'],
    default: 0
  },
  // 物品品相
  condition: {
    type: String,
    enum: ['mint', 'near_mint', 'excellent', 'good', 'fair', 'poor'],
    default: 'near_mint'
  },
  // 物品描述
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  // 标签列表
  tags: [{
    type: String,
    trim: true
  }],
  // 图片列表
  images: [{
    type: String
  }],
  // 获取日期
  acquisitionDate: {
    type: Date,
    default: Date.now
  },
  // 获取价格
  acquisitionPrice: {
    type: Number,
    min: [0, '购买价格不能为负数'],
    default: 0
  },
  // 获取来源
  acquisitionSource: {
    type: String,
    trim: true,
    default: ''
  },
  // 是否收藏
  isFavorite: {
    type: Boolean,
    default: false
  },
  // 是否在愿望单
  isWishlist: {
    type: Boolean,
    default: false
  },
  // 交易历史记录
  tradeHistory: [{
    type: { type: String, enum: ['buy', 'sell', 'trade'] },
    price: Number,
    date: { type: Date, default: Date.now },
    counterparty: String,
    notes: String
  }],
  // 系列名称
  setName: {
    type: String,
    trim: true,
    default: ''
  },
  // 系列编号
  setNumber: {
    type: String,
    trim: true,
    default: ''
  },
  // 语言版本
  language: {
    type: String,
    default: 'english'
  },
  // 是否为闪卡
  foil: {
    type: Boolean,
    default: false
  },
  // 评级信息
  graded: {
    company: { type: String, default: '' },
    grade: { type: String, default: '' },
    certificationNumber: { type: String, default: '' }
  },
  // 存储位置
  storageLocation: {
    type: String,
    trim: true,
    default: ''
  },
  // 所有者
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
  },
  // Rune卡牌特有信息
  runeCardInfo: {
    version: {
      type: String,
      enum: ['OGN', 'SFD', 'UNL', 'P'],
      default: 'OGN'
    },
    cardNumber: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // 卡牌属性
  cardProperty: {
    type: String,
    enum: ['传奇', '英雄', '专属', '单位', '装备', '法术', '战场', '指示物', '符文'],
    default: null
  },
  // 关联店铺
  relatedShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  // 添加者
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // 是否在商店中
  inShop: {
    type: Boolean,
    default: false
  },
  // 售价
  price: {
    type: Number,
    min: [0, '售价不能为负数'],
    default: 0
  }
});

// 保存前自动更新updatedAt字段
inventoryItemSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// 创建索引优化查询性能
inventoryItemSchema.index({ userId: 1 });
inventoryItemSchema.index({ userId: 1, itemType: 1 });

// 导出库存物品模型
module.exports = mongoose.model('InventoryItem', inventoryItemSchema);