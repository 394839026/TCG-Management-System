const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const Notification = require('../models/Notification')
const User = require('../models/User')

router.post('/', protect, async (req, res) => {
  try {
    const { type, title, content, recipientEmail, relatedId } = req.body

    let recipient = null

    if (recipientEmail) {
      recipient = await User.findOne({ email: recipientEmail })
    }

    const notification = new Notification({
      recipient: recipient ? recipient._id : req.user._id,
      type,
      title,
      content,
      relatedId,
      isRead: false,
    })

    await notification.save()

    res.status(201).json({
      success: true,
      message: '通知创建成功',
      data: notification,
    })
  } catch (error) {
    console.error('创建通知错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Notification.countDocuments({ recipient: req.user._id })
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    })

    res.json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      data: notifications,
    })
  } catch (error) {
    console.error('获取通知错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

router.get('/unread-count', protect, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    })

    res.json({
      success: true,
      count: unreadCount,
    })
  } catch (error) {
    console.error('获取未读通知数错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    })

    if (!notification) {
      return res.status(404).json({ message: '通知不存在' })
    }

    notification.isRead = true
    await notification.save()

    res.json({
      success: true,
      message: '已标记为已读',
      data: notification,
    })
  } catch (error) {
    console.error('标记通知已读错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    )

    res.json({
      success: true,
      message: '已全部标记为已读',
    })
  } catch (error) {
    console.error('标记全部通知已读错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    })

    if (!notification) {
      return res.status(404).json({ message: '通知不存在' })
    }

    res.json({
      success: true,
      message: '通知已删除',
    })
  } catch (error) {
    console.error('删除通知错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

module.exports = router
