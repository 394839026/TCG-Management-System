const mongoose = require('mongoose');

const tradeMessageSchema = new mongoose.Schema({
  listing: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TradeListing', 
    required: [true, '交易挂牌是必填项']
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '发送者是必填项']
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '接收者是必填项']
  },
  content: { 
    type: String, 
    required: [true, '消息内容是必填项'],
    maxlength: [1000, '消息内容不能超过1000个字符'],
    trim: true
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 索引优化
tradeMessageSchema.index({ listing: 1 });
tradeMessageSchema.index({ sender: 1, receiver: 1 });
tradeMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TradeMessage', tradeMessageSchema);
