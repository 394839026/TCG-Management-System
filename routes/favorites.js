const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const FavoriteListing = require('../models/FavoriteListing')
const TradeListing = require('../models/TradeListing')

// @route   POST /api/favorites/:listingId
// @desc    添加收藏
// @access  Private
router.post('/:listingId', protect, async (req, res) => {
  try {
    const listing = await TradeListing.findById(req.params.listingId)
    if (!listing) {
      return res.status(404).json({ message: '意向不存在' })
    }

    const existing = await FavoriteListing.findOne({
      user: req.user._id,
      listing: req.params.listingId,
    })

    if (existing) {
      return res.status(400).json({ message: '已经收藏过了' })
    }

    const favorite = await FavoriteListing.create({
      user: req.user._id,
      listing: req.params.listingId,
    })

    res.status(201).json({
      success: true,
      message: '收藏成功',
      data: favorite,
    })
  } catch (error) {
    console.error('添加收藏错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// @route   DELETE /api/favorites/:listingId
// @desc    取消收藏
// @access  Private
router.delete('/:listingId', protect, async (req, res) => {
  try {
    const favorite = await FavoriteListing.findOneAndDelete({
      user: req.user._id,
      listing: req.params.listingId,
    })

    if (!favorite) {
      return res.status(404).json({ message: '收藏不存在' })
    }

    res.json({
      success: true,
      message: '已取消收藏',
    })
  } catch (error) {
    console.error('取消收藏错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// @route   GET /api/favorites
// @desc    获取我的收藏列表
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const favorites = await FavoriteListing.find({ user: req.user._id })
      .populate({
        path: 'listing',
        populate: [
          { path: 'seller', select: 'username avatar' },
          { path: 'items.item', select: 'itemName rarity cardProperty' }
        ]
      })
      .sort({ createdAt: -1 })

    const validFavorites = favorites.filter(f => f.listing !== null)

    res.json({
      success: true,
      count: validFavorites.length,
      data: validFavorites.map(f => ({
        _id: f.listing._id,
        orderNumber: f.listing.orderNumber,
        type: f.listing.type,
        title: f.listing.title,
        description: f.listing.description,
        price: f.listing.price,
        status: f.listing.status,
        items: f.listing.items,
        requestedItems: f.listing.requestedItems,
        seller: f.listing.seller,
        createdAt: f.listing.createdAt,
        updatedAt: f.listing.updatedAt,
        favoritedAt: f.createdAt,
      })),
    })
  } catch (error) {
    console.error('获取收藏列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// @route   GET /api/favorites/check/:listingId
// @desc    检查是否已收藏
// @access  Private
router.get('/check/:listingId', protect, async (req, res) => {
  try {
    const favorite = await FavoriteListing.findOne({
      user: req.user._id,
      listing: req.params.listingId,
    })

    res.json({
      success: true,
      isFavorited: !!favorite,
    })
  } catch (error) {
    console.error('检查收藏错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

module.exports = router
