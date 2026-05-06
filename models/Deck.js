const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, '卡组名称是必填项'], 
    trim: true,
    minlength: [1, '卡组名称不能为空'],
    maxlength: [100, '卡组名称不能超过100个字符']
  },
  game: { 
    type: String, 
    enum: ['rune', 'digimon', 'pokemon', 'shadowverse-evolve'],
    required: [true, '游戏类型是必填项']
  },
  type: {
    type: String,
    enum: ['building', 'deck'],
    default: 'deck'
  },
  format: { 
    type: String, 
    default: '',
    trim: true
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '卡组所有者是必填项']
  },
  legend: [{
    card: { 
      type: mongoose.Schema.Types.Mixed
    },
    quantity: { 
      type: Number, 
      min: [1, '数量至少为1']
    }
  }],
  mainDeck: [{
    card: { 
      type: mongoose.Schema.Types.Mixed
    },
    quantity: { 
      type: Number, 
      min: [1, '数量至少为1']
    }
  }],
  sideDeck: [{
    card: { 
      type: mongoose.Schema.Types.Mixed
    },
    quantity: { 
      type: Number, 
      min: [1, '数量至少为1']
    }
  }],
  battlefield: [{
    card: { 
      type: mongoose.Schema.Types.Mixed
    },
    quantity: { 
      type: Number, 
      min: [1, '数量至少为1']
    }
  }],
  runes: [{
    card: { 
      type: mongoose.Schema.Types.Mixed
    },
    quantity: { 
      type: Number, 
      min: [1, '数量至少为1']
    }
  }],
  tokens: [{
    card: { 
      type: mongoose.Schema.Types.Mixed
    },
    quantity: { 
      type: Number, 
      min: [1, '数量至少为1']
    }
  }],
  // 兼容旧数据
  cards: [{
    card: { 
      type: mongoose.Schema.Types.Mixed
    },
    quantity: { 
      type: Number, 
      min: [1, '数量至少为1']
    },
    sideboard: { 
      type: Boolean, 
      default: false 
    }
  }],
  description: { 
    type: String, 
    maxlength: [1000, '卡组描述不能超过1000个字符'],
    default: ''
  },
  tags: [{ 
    type: String, 
    trim: true 
  }],
  isPublic: { 
    type: Boolean, 
    default: false 
  },
  isFavorite: { 
    type: Boolean, 
    default: false 
  },
  stats: {
    wins: { 
      type: Number, 
      default: 0,
      min: [0, '胜场数不能为负数']
    },
    losses: { 
      type: Number, 
      default: 0,
      min: [0, '败场数不能为负数']
    },
    draws: { 
      type: Number, 
      default: 0,
      min: [0, '平局数不能为负数']
    }
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
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
deckSchema.index({ owner: 1 });
deckSchema.index({ game: 1, format: 1 });
deckSchema.index({ isPublic: 1, createdAt: -1 });
deckSchema.index({ name: 'text' });

// 更新时间戳
deckSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Deck', deckSchema);
