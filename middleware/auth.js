// 认证中间件 - 负责用户身份验证和权限控制
// 包含JWT令牌验证和角色权限检查

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 身份验证中间件 - 验证JWT令牌并获取用户信息
const protect = async (req, res, next) => {
  let token;

  // 从Authorization头部获取Bearer令牌
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 提取令牌
      token = req.headers.authorization.split(' ')[1];
      // 验证令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // 查找用户并附加到请求对象（不包含密码）
      req.user = await User.findById(decoded.id).select('-password');
      // 继续下一个中间件或路由处理
      next();
    } catch (error) {
      console.error('[AUTH] Token verification failed:', error.message);
      return res.status(401).json({ message: '未授权，令牌无效' });
    }
  }

  // 未提供令牌
  if (!token) {
    return res.status(401).json({ message: '未授权，没有令牌' });
  }
};

// 角色权限中间件工厂函数 - 检查用户是否有指定角色权限
const authorize = (...roles) => {
  return (req, res, next) => {
    // 检查用户是否存在且角色在允许列表中
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `需要以下权限之一: ${roles.join(', ')}`
      });
    }
    // 权限验证通过，继续
    next();
  };
};

// 导出中间件
module.exports = { protect, authorize };
