const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'achievement', 'one-time'],
    required: true,
    default: 'daily'
  },
  category: {
    type: String,
    enum: ['inventory', 'trade', 'deck', 'shop', 'social', 'other'],
    required: true,
    default: 'other'
  },
  // 任务目标条件
  target: {
    action: { type: String, required: true }, // 例如: 'add_item', 'create_deck'
    value: { type: Number, required: true }, // 目标数量
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }, // 可选：指定物品
    cardType: { type: String }, // 可选：指定卡牌类型
    gameType: { type: String } // 可选：指定游戏类型
  },
  // 奖励
  rewards: {
    exp: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    coins: { type: Number, default: 0 }
  },
  // 是否启用
  isActive: {
    type: Boolean,
    default: true
  },
  // 排序
  sortOrder: {
    type: Number,
    default: 0
  },
  // 有效期（针对每日/每周任务
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// 索引
taskSchema.index({ type: 1, isActive: 1 });
taskSchema.index({ category: 1 });

module.exports = mongoose.model('Task', taskSchema);
