const mongoose = require('mongoose')

const favoriteListingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradeListing',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
})

favoriteListingSchema.index({ user: 1, listing: 1 }, { unique: true })

module.exports = mongoose.model('FavoriteListing', favoriteListingSchema)
