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
    enum: ['N', 'N_FOIL', 'U', 'U_FOIL', 'R', 'E', 'AA', 'AA_SIGN', 'AA_ULTIMATE', 'common', 'uncommon', 'rare', 'super_rare', 'ultra_rare', 'secret_rare', 'other'],
    default: 'N'
  },
  gameType: {
    type: String,
    enum: ['rune', 'digimon', 'pokemon', 'shadowverse-evolve']
  },
  itemType: {
    type: String,
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
  isFavorite: {
    type: Boolean,
    default: false
  },
  isWishlist: {
    type: Boolean,
    default: false
  },
  tradeHistory: [{
    type: { type: String, enum: ['buy', 'sell', 'trade'] },
    price: Number,
    date: { type: Date, default: Date.now },
    counterparty: String,
    notes: String
  }],
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
    default: 'english'
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
  cardProperty: {
    type: String,
    enum: ['传奇', '英雄', '专属', '单位', '装备', '法术', '战场', '指示物', '符文'],
    default: null
  }
});

inventoryItemSchema.pre('save', function() {
  this.updatedAt = new Date();
});

inventoryItemSchema.index({ userId: 1 });
inventoryItemSchema.index({ userId: 1, itemType: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);