const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../public/uploads');
const musicDir = path.join(__dirname, '../public/uploads/music');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'music') {
      cb(null, musicDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤 - 允许图片、文档和音频
const fileFilter = (req, file, cb) => {
  // 根据字段名判断允许的文件类型
  let allowedExts;
  let allowedMimeTypes;
  let errorMessage;
  
  if (file.fieldname === 'contract') {
    // 合约字段只允许PDF格式
    allowedExts = /pdf/;
    allowedMimeTypes = /pdf/;
    errorMessage = '只支持PDF格式文件';
  } else if (file.fieldname === 'music') {
    // 音乐文件允许常见音频格式
    allowedExts = /mp3|wav|ogg|flac|aac|m4a|webm|mp4|wma/;
    allowedMimeTypes = /audio\/|video\/mp4/;
    errorMessage = '只支持音频文件 (mp3, wav, ogg, flac, aac, m4a)';
  } else {
    // 其他字段允许图片
    allowedExts = /jpeg|jpg|png|gif|webp/;
    allowedMimeTypes = /image\/jpeg|image\/png|image\/gif|image\/webp/;
    errorMessage = '只支持图片文件 (jpeg, jpg, png, gif, webp)';
  }
  
  const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.test(file.mimetype);
  
  // 对于音频文件，只要扩展名符合就允许（放宽MIME类型检查）
  if (file.fieldname === 'music' && extname) {
    return cb(null, true);
  }
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error(errorMessage));
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB限制（音乐文件更大）
  },
  fileFilter: fileFilter
});

// 错误处理中间件
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: '文件大小不能超过50MB' 
      });
    }
    return res.status(400).json({ 
      message: `文件上传错误: ${err.message}` 
    });
  } else if (err) {
    return res.status(400).json({ 
      message: err.message 
    });
  }
  next();
};

module.exports = {
  upload,
  handleUploadError
};
