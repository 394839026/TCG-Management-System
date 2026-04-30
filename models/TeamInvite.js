const mongoose = require('mongoose')

const teamInviteSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
    index: true,
  },
  message: {
    type: String,
    maxlength: 200,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
  }
}, {
  timestamps: true,
})

teamInviteSchema.index({ team: 1, invitedUser: 1 }, { unique: true })

module.exports = mongoose.model('TeamInvite', teamInviteSchema)
