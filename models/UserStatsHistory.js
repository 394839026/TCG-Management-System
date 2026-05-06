const mongoose = require('mongoose');

const userStatsHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  // 当天的统计数据
  totalItems: {
    type: Number,
    default: 0
  },
  totalQuantity: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  itemTypes: {
    type: Number,
    default: 0
  },
  // 各品类物品总数
  digimonCount: {
    type: Number,
    default: 0
  },
  runeCount: {
    type: Number,
    default: 0
  },
  pokemonCount: {
    type: Number,
    default: 0
  },
  shadowverseEvolveCount: {
    type: Number,
    default: 0
  }
});

// 为日期和用户创建复合索引，保证一个用户每天只有一条记录
userStatsHistorySchema.index({ userId: 1, date: 1 }, { unique: true });

// 静态方法：获取或创建今天的记录
userStatsHistorySchema.statics.getOrCreateToday = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 设置为今天的开始
  
  let history = await this.findOne({ userId, date: today });
  
  if (!history) {
    history = await this.create({ userId, date: today });
  }
  
  return history;
};

module.exports = mongoose.model('UserStatsHistory', userStatsHistorySchema);
