const mongoose = require('mongoose');

const shopMessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopConversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, '消息内容是必填项'],
    maxlength: [1000, '消息内容不能超过1000个字符'],
    trim: true
  },
  isRead: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

shopMessageSchema.index({ conversation: 1, createdAt: -1 });
shopMessageSchema.index({ sender: 1 });

const shopConversationSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    type: shopMessageSchema,
    default: null
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true // 自动管理 createdAt 和 updatedAt
});

shopConversationSchema.index({ shop: 1, customer: 1 });
shopConversationSchema.index({ customer: 1 });
shopConversationSchema.index({ updatedAt: -1 });

const ShopMessage = mongoose.model('ShopMessage', shopMessageSchema);
const ShopConversation = mongoose.model('ShopConversation', shopConversationSchema);

module.exports = {
  ShopMessage,
  ShopConversation
};
