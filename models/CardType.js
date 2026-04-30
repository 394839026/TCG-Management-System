const mongoose = require('mongoose');

const cardTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '类型名称是必填项'],
    trim: true,
    unique: true,
    index: true
  },
  gameType: {
    type: String,
    enum: ['rune', 'digimon', 'pokemon', 'shadowverse-evolve'],
    required: [true, '所属游戏是必填项']
  },
  cardProperty: {
    type: String,
    enum: ['传奇', '英雄', '专属', '单位', '装备', '法术', '战场', '指示物', '符文'],
    // 只在 gameType 为 'rune' 时使用，且可以为空
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
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

cardTypeSchema.pre('save', function() {
  this.updatedAt = new Date();
});

cardTypeSchema.index({ name: 1, gameType: 1 }, { unique: true });

module.exports = mongoose.model('CardType', cardTypeSchema);