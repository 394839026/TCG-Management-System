const mongoose = require('mongoose');

const rarityProbabilitySchema = new mongoose.Schema({
  rarityId: {
    type: String,
    required: true,
  },
  rarityName: {
    type: String,
    required: true,
  },
  probability: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 1,
  },
  color: {
    type: String,
    default: 'text-gray-600',
  },
  bgColor: {
    type: String,
    default: 'bg-gray-100',
  },
  borderColor: {
    type: String,
    default: 'border-gray-300',
  },
  glowColor: {
    type: String,
    default: '',
  },
});

const gachaProbabilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  rarities: [rarityProbabilitySchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

const GachaProbability = mongoose.model('GachaProbability', gachaProbabilitySchema);

module.exports = GachaProbability;
