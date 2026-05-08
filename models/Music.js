// 音乐数据模型 - 存储管理员上传的音乐文件信息

const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema({
  // 音乐标题
  title: {
    type: String,
    required: [true, '音乐标题是必填项'],
    trim: true,
    maxlength: [100, '标题不能超过100个字符']
  },
  // 艺术家/歌手
  artist: {
    type: String,
    trim: true,
    default: '未知艺术家',
    maxlength: [100, '艺术家名称不能超过100个字符']
  },
  // 音乐文件路径
  filePath: {
    type: String,
    required: [true, '音乐文件路径是必填项']
  },
  // 文件大小（字节）
  fileSize: {
    type: Number,
    required: true
  },
  // 时长（秒）
  duration: {
    type: Number,
    default: 0
  },
  // 上传者
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 是否启用
  isActive: {
    type: Boolean,
    default: true
  },
  // 播放次数
  playCount: {
    type: Number,
    default: 0
  },
  // 排序权重
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 增加播放次数
musicSchema.methods.incrementPlayCount = async function() {
  this.playCount += 1;
  await this.save();
};

module.exports = mongoose.model('Music', musicSchema);
