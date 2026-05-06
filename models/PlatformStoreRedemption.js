const mongoose = require('mongoose');

const platformStoreRedemptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformStoreItem',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  currencyType: {
    type: String,
    enum: ['points', 'coins'],
    default: 'points'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  // 如果是库存物品，保存发放记录
  userInventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInventory'
  },
  // 备注
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PlatformStoreRedemption', platformStoreRedemptionSchema);
