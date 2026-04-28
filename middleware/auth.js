const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 从header中获取token
      token = req.headers.authorization.split(' ')[1];

      // 验证token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 获取用户信息(不包含密码)
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: '未授权，令牌无效' });
    }
  }

  if (!token) {
    res.status(401).json({ message: '未授权，没有令牌' });
  }
};

// 角色权限中间件工厂函数
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `需要以下权限之一: ${roles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
