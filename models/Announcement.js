const mongoose = require('mongoose')

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['update', 'announcement', 'important', 'event'],
    default: 'announcement',
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  views: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
})

// 索引
announcementSchema.index({ isActive: 1, createdAt: -1 })
announcementSchema.index({ isPinned: 1, createdAt: -1 })
announcementSchema.index({ type: 1, createdAt: -1 })

module.exports = mongoose.model('Announcement', announcementSchema)
