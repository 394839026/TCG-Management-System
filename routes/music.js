// 音乐管理路由 - 处理音乐上传、列表获取、删除等操作

const express = require('express');
const router = express.Router();
const Music = require('../models/Music');
const { upload, handleUploadError } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// 获取音乐列表（所有登录用户都可以访问）
router.get('/list', protect, async (req, res) => {
  try {
    const musicList = await Music.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('uploadedBy', 'username');
    
    res.json({
      success: true,
      data: musicList
    });
  } catch (error) {
    console.error('获取音乐列表错误:', error);
    res.status(500).json({ success: false, message: '获取音乐列表失败' });
  }
});

// 获取所有音乐（管理员专属，包含未启用的）
router.get('/admin/list', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const musicList = await Music.find()
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username');
    
    res.json({
      success: true,
      data: musicList
    });
  } catch (error) {
    console.error('获取音乐列表错误:', error);
    res.status(500).json({ success: false, message: '获取音乐列表失败' });
  }
});

// 上传音乐（管理员专属）
router.post('/upload', protect, authorize('admin', 'superadmin'), upload.single('music'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择音乐文件' });
    }

    const { title, artist } = req.body;
    
    if (!title) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: '音乐标题是必填项' });
    }

    const music = new Music({
      title,
      artist: artist || '未知艺术家',
      filePath: `/uploads/music/${req.file.filename}`,
      fileSize: req.file.size,
      uploadedBy: req.user._id
    });

    await music.save();

    res.json({
      success: true,
      message: '音乐上传成功',
      data: music
    });
  } catch (error) {
    console.error('上传音乐错误:', error);
    res.status(500).json({ success: false, message: '上传音乐失败' });
  }
});

// 删除音乐（管理员专属）
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);
    
    if (!music) {
      return res.status(404).json({ success: false, message: '音乐不存在' });
    }

    // 删除文件
    const filePath = path.join(__dirname, '../public', music.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Music.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '音乐删除成功'
    });
  } catch (error) {
    console.error('删除音乐错误:', error);
    res.status(500).json({ success: false, message: '删除音乐失败' });
  }
});

// 切换音乐启用状态（管理员专属）
router.put('/:id/toggle', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);
    
    if (!music) {
      return res.status(404).json({ success: false, message: '音乐不存在' });
    }

    music.isActive = !music.isActive;
    await music.save();

    res.json({
      success: true,
      message: '音乐状态更新成功',
      data: music
    });
  } catch (error) {
    console.error('更新音乐状态错误:', error);
    res.status(500).json({ success: false, message: '更新音乐状态失败' });
  }
});

// 增加播放次数
router.post('/:id/play', protect, async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);
    
    if (!music) {
      return res.status(404).json({ success: false, message: '音乐不存在' });
    }

    await music.incrementPlayCount();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('更新播放次数错误:', error);
    res.status(500).json({ success: false, message: '更新播放次数失败' });
  }
});

module.exports = router;
