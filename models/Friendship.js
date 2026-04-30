const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '请求者是必填项']
  },
  addressee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '被请求者是必填项']
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'blocked'], 
    default: 'pending'
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

// 复合唯一索引：防止重复好友请求
friendshipSchema.index({ requester: 1, addressee: 1 }, { unique: true });
friendshipSchema.index({ addressee: 1, status: 1 });

// 更新时间戳
friendshipSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Friendship', friendshipSchema);
