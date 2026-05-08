const mongoose = require('mongoose');

const inventoryViewRequestSchema = new mongoose.Schema({
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '请求者是必填项']
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '库存所有者是必填项']
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'expired'], 
    default: 'pending'
  },
  message: { 
    type: String, 
    default: '', 
    maxlength: 500 
  },
  expiresAt: { 
    type: Date, 
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 7); // 默认7天后过期
      return date;
    }
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

// 复合唯一索引：防止重复申请
inventoryViewRequestSchema.index({ requester: 1, owner: 1, status: 1 }, { unique: true });
inventoryViewRequestSchema.index({ owner: 1, status: 1 });
inventoryViewRequestSchema.index({ requester: 1, status: 1 });

// 更新时间戳
inventoryViewRequestSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// 检查是否过期的方法
inventoryViewRequestSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// 检查是否可以查看
inventoryViewRequestSchema.methods.canView = function() {
  return this.status === 'accepted' && !this.isExpired();
};

module.exports = mongoose.model('InventoryViewRequest', inventoryViewRequestSchema);
