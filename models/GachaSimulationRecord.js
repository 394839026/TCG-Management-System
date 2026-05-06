const mongoose = require('mongoose');

// 单次抽卡结果记录
const singleDrawResultSchema = new mongoose.Schema({
  rarityId: {
    type: String,
    required: true,
  },
  rarityName: {
    type: String,
    required: true,
  },
  // 可选：关联的卡牌信息（如果有真实卡牌的话）
  cardName: String,
  cardId: String,
  // 是否是保底机制触发的
  isPity: {
    type: Boolean,
    default: false,
  },
}, {
  _id: false,
  strict: false, // 允许额外字段
});

// 模拟抽卡会话记录
const gachaSimulationRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // 使用的概率配置
  configId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  configName: {
    type: String,
    required: true,
  },
  // 抽卡次数
  drawCount: {
    type: Number,
    required: true,
    min: 1,
  },
  // 抽卡结果统计
  results: [{
    rarityId: String,
    rarityName: String,
    count: Number,
    percentage: Number,
    expectedPercentage: Number,
    difference: Number,
  }],
  // 详细的抽卡记录（可选，只在需要时保存）
  detailedResults: [singleDrawResultSchema],
  // 抽卡备注
  note: {
    type: String,
    default: '',
  },
  // 用于显示的标签
  tags: [{
    type: String,
  }],
  // 累计抽卡次数统计（从上次记录后的累计
  pityCount: {
    type: Number,
    default: 0,
  },
  // 是否是真实抽卡（不是模拟）
  isRealGacha: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  strict: false, // 允许额外字段
});

// 创建索引
gachaSimulationRecordSchema.index({ userId: 1, createdAt: -1 });

const GachaSimulationRecord = mongoose.model('GachaSimulationRecord', gachaSimulationRecordSchema);

module.exports = GachaSimulationRecord;
