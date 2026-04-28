const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤 - 只允许图片
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'));
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: fileFilter
});

// 错误处理中间件
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: '文件大小不能超过5MB' 
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
