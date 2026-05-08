const mongoose = require('mongoose');

const backpackItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformStoreItem',
    required: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  itemDescription: {
    type: String,
    trim: true,
    default: ''
  },
  redemptionCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  itemType: {
    type: String,
    enum: ['physical', 'digital', 'coupon', 'membership', 'other'],
    default: 'digital'
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  status: {
    type: String,
    enum: ['unused', 'used', 'expired'],
    default: 'unused'
  },
  expirationDate: {
    type: Date
  },
  usedAt: {
    type: Date
  },
  acquiredFrom: {
    type: String,
    trim: true,
    default: 'platform_store'
  },
  additionalInfo: {
    type: Object,
    default: {}
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

backpackItemSchema.pre('save', function() {
  this.updatedAt = new Date();
});

backpackItemSchema.index({ userId: 1 });
backpackItemSchema.index({ redemptionCode: 1 }, { unique: true });
backpackItemSchema.index({ status: 1 });

module.exports = mongoose.model('Backpack', backpackItemSchema);