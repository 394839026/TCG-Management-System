const express = require('express')
const router = express.Router()
const Announcement = require('../models/Announcement')
const { protect, authorize } = require('../middleware/auth')

// 获取公告列表
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isActive } = req.query
    const query = { isActive: isActive !== 'false' ? true : false }
    
    if (type) {
      query.type = type
    }
    
    const announcements = await Announcement.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'username avatar')
    
    const total = await Announcement.countDocuments(query)
    
    res.json({
      success: true,
      data: announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取公告错误:', error)
    res.status(500).json({ success: false, message: '获取公告失败' })
  }
})

// 获取单个公告
router.get('/:id', protect, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'username avatar')
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' })
    }
    
    // 增加浏览量
    announcement.views += 1
    await announcement.save()
    
    res.json({ success: true, data: announcement })
  } catch (error) {
    console.error('获取公告错误:', error)
    res.status(500).json({ success: false, message: '获取公告失败' })
  }
})

// 创建公告 (管理员)
router.post('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { title, content, type, priority, isPinned, tags, expiresAt } = req.body
    
    const announcement = new Announcement({
      title,
      content,
      type: type || 'announcement',
      priority: priority || 'normal',
      isPinned: isPinned || false,
      createdBy: req.user._id,
      tags: tags || [],
      expiresAt,
    })
    
    await announcement.save()
    await announcement.populate('createdBy', 'username avatar')
    
    res.status(201).json({ success: true, data: announcement })
  } catch (error) {
    console.error('创建公告错误:', error)
    res.status(500).json({ success: false, message: '创建公告失败' })
  }
})

// 更新公告 (管理员)
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' })
    }
    
    const { title, content, type, priority, isPinned, isActive, tags, expiresAt } = req.body
    
    if (title !== undefined) announcement.title = title
    if (content !== undefined) announcement.content = content
    if (type !== undefined) announcement.type = type
    if (priority !== undefined) announcement.priority = priority
    if (isPinned !== undefined) announcement.isPinned = isPinned
    if (isActive !== undefined) announcement.isActive = isActive
    if (tags !== undefined) announcement.tags = tags
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt
    
    await announcement.save()
    await announcement.populate('createdBy', 'username avatar')
    
    res.json({ success: true, data: announcement })
  } catch (error) {
    console.error('更新公告错误:', error)
    res.status(500).json({ success: false, message: '更新公告失败' })
  }
})

// 删除公告 (管理员)
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' })
    }
    
    await announcement.deleteOne()
    
    res.json({ success: true, message: '公告已删除' })
  } catch (error) {
    console.error('删除公告错误:', error)
    res.status(500).json({ success: false, message: '删除公告失败' })
  }
})

module.exports = router
