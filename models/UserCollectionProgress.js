const mongoose = require('mongoose');

// 单个物品的收集记录
const collectedItemSchema = new mongoose.Schema({
  // 物品类型
  itemType: {
    type: String,
    enum: ['card', 'badge', 'title', 'other'],
    default: 'card',
  },
  // 物品唯一标识（如卡牌ID、徽章ID等）
  itemId: {
    type: String,
    required: true,
  },
  // 物品名称
  itemName: {
    type: String,
    required: true,
  },
  // 稀有度
  rarity: String,
  // 收集数量
  count: {
    type: Number,
    default: 1,
    min: 1,
  },
  // 首次获取时间
  firstObtainedAt: {
    type: Date,
    default: Date.now,
  },
  // 最后获取时间
  lastObtainedAt: {
    type: Date,
    default: Date.now,
  },
  // 来源（抽卡、商店、任务等）
  source: {
    type: String,
    enum: ['gacha', 'store', 'task', 'trade', 'gift', 'other'],
    default: 'gacha',
  },
  // 来源详情
  sourceDetail: String,
  // 备注
  note: String,
}, {
  _id: false,
});

// 收集分类记录
const collectionCategorySchema = new mongoose.Schema({
  // 分类ID或名称
  categoryId: String,
  categoryName: {
    type: String,
    required: true,
  },
  // 该分类总物品数
  totalItems: {
    type: Number,
    default: 0,
  },
  // 已收集物品数
  collectedItems: {
    type: Number,
    default: 0,
  },
  // 完成度百分比
  completionPercentage: {
    type: Number,
    default: 0,
  },
  // 该分类的物品列表
  items: [collectedItemSchema],
}, {
  _id: false,
});

// 用户收集进度主模型
const userCollectionProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // 总体收集统计
  totalCollected: {
    type: Number,
    default: 0,
  },
  totalUnique: {
    type: Number,
    default: 0,
  },
  // 分分类的收集情况
  categories: [collectionCategorySchema],
  // 所有收集的物品（不按分类）
  allItems: [collectedItemSchema],
  // 抽卡统计
  gachaStats: {
    totalDraws: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    // 按稀有度统计抽中次数
    rarityStats: [{
      rarityId: String,
      rarityName: String,
      count: Number,
    }],
    // 最近抽卡记录（简略）
    recentDraws: [{
      rarityId: String,
      rarityName: String,
      cardName: String,
      drawTime: Date,
    }],
  },
  // 成就/里程碑
  achievements: [{
    achievementId: String,
    name: String,
    description: String,
    unlockedAt: Date,
  }],
  // 自定义字段（用于扩展）
  customData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// 创建索引
userCollectionProgressSchema.index({ userId: 1 });

// 方法：添加收集物品
userCollectionProgressSchema.methods.addCollectedItem = function(item) {
  // 先检查是否已经有这个物品
  const existingItem = this.allItems.find(
    i => i.itemId === item.itemId && i.itemType === item.itemType
  );

  if (existingItem) {
    // 更新现有物品
    existingItem.count += item.count || 1;
    existingItem.lastObtainedAt = Date.now();
    if (item.source) existingItem.source = item.source;
    if (item.sourceDetail) existingItem.sourceDetail = item.sourceDetail;
  } else {
    // 添加新物品
    this.allItems.push(item);
    this.totalUnique += 1;
  }

  this.totalCollected += item.count || 1;
  
  // 如果是抽卡来源，更新抽卡统计
  if (item.source === 'gacha') {
    this.gachaStats.totalDraws += 1;
    // 更新累计消耗
    if (item.spent) {
      this.gachaStats.totalSpent += item.spent;
    }
    
    // 获取正确的稀有度名称
    let rarityName = item.rarity;
    const rarityNames = {
      'N': '普通',
      'N_FOIL': '普通（闪）',
      'U': '不凡',
      'U_FOIL': '不凡（闪）',
      'R': '稀有',
      'E': '史诗',
      'AA': '异画',
      'AA_SIGN': '异画（签字）',
      'AA_ULTIMATE': '异画（终极超编）',
      'common': '普通',
      'uncommon': '不凡',
      'rare': '稀有',
      'super_rare': '超稀有',
      'ultra_rare': '极稀有',
      'secret_rare': '秘密稀有',
    };
    if (rarityNames[item.rarity]) {
      rarityName = rarityNames[item.rarity];
    }
    
    if (item.rarity) {
      const stat = this.gachaStats.rarityStats.find(s => s.rarityId === item.rarity);
      if (stat) {
        stat.count += 1;
      } else {
        this.gachaStats.rarityStats.push({
          rarityId: item.rarity,
          rarityName: rarityName,
          count: 1,
        });
      }
    }

    // 添加到最近抽卡记录
    this.gachaStats.recentDraws.unshift({
      rarityId: item.rarity,
      rarityName: rarityName,
      cardName: item.itemName,
      drawTime: Date.now(),
    });
    // 只保留最近100条
    if (this.gachaStats.recentDraws.length > 100) {
      this.gachaStats.recentDraws = this.gachaStats.recentDraws.slice(0, 100);
    }
  }

  return this.save();
};

const UserCollectionProgress = mongoose.model('UserCollectionProgress', userCollectionProgressSchema);

module.exports = UserCollectionProgress;
