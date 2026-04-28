const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 内存数据库（用于演示）
const users = [];
let userId = 1;

// 生成JWT令牌
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'default-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// JWT认证中间件
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
      req.user = users.find(u => u.id === decoded.id);

      if (!req.user) {
        return res.status(401).json({ message: '用户不存在' });
      }

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

// 角色权限中间件
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

// 用户注册（公开）
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ message: '请填写所有字段' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: '用户名长度必须在3-20个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: '密码长度至少为6个字符' });
    }

    // 检查用户是否已存在
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? '该邮箱已被注册' : '该用户名已被使用'
      });
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 第一个注册用户自动成为超级管理员
    const isFirstUser = users.length === 0;
    const role = isFirstUser ? 'superadmin' : 'user';

    // 创建新用户
    const newUser = {
      id: userId++,
      username,
      email,
      password: hashedPassword,
      role: role,
      createdAt: new Date()
    };

    users.push(newUser);

    if (isFirstUser) {
      console.log('\n✓ 检测到首个注册用户，已自动设置为超级管理员');
      console.log(`  用户名: ${username}`);
      console.log(`  邮箱: ${email}\n`);
    }

    res.status(201).json({
      success: true,
      data: {
        _id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        token: generateToken(newUser.id)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: '请填写所有字段' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    res.json({
      success: true,
      data: {
        _id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user.id)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', protect, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// 管理员注册用户
app.post('/api/auth/admin/register', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: '请填写所有字段' });
    }

    // 检查用户是否已存在
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? '该邮箱已被注册' : '该用户名已被使用'
      });
    }

    // 普通管理员只能创建user角色
    const newRole = req.user.role === 'superadmin' ? (role || 'user') : 'user';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: userId++,
      username,
      email,
      password: hashedPassword,
      role: newRole,
      createdAt: new Date()
    };

    users.push(newUser);

    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: {
        _id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 修改用户角色（仅超级管理员）
app.put('/api/auth/users/:id/role', protect, authorize('superadmin'), (req, res) => {
  try {
    const { role } = req.body;
    const userId = parseInt(req.params.id);

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: '无效的角色' });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ message: '不能修改自己的角色' });
    }

    user.role = role;

    res.json({
      success: true,
      message: '用户角色更新成功',
      data: {
        _id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取所有用户列表（管理员和超级管理员）
app.get('/api/auth/users', protect, authorize('admin', 'superadmin'), (req, res) => {
  const userList = users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt
  }));

  res.json({
    success: true,
    count: userList.length,
    data: userList
  });
});

// 删除用户（仅超级管理员）
app.delete('/api/auth/users/:id', protect, authorize('superadmin'), (req, res) => {
  const userId = parseInt(req.params.id);

  if (userId === req.user.id) {
    return res.status(400).json({ message: '不能删除自己的账户' });
  }

  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ message: '用户不存在' });
  }

  users.splice(userIndex, 1);

  res.json({
    success: true,
    message: '用户已删除'
  });
});

// ==================== 库存管理路由 ====================

// 内存存储库存数据
const inventory = [];
let inventoryId = 1;

// 获取当前用户的库存
app.get('/api/inventory', protect, (req, res) => {
  const userItems = inventory.filter(item => item.userId === req.user.id);
  
  res.json({
    success: true,
    count: userItems.length,
    data: userItems
  });
});

// 获取库存统计
app.get('/api/inventory/stats', protect, (req, res) => {
  const userItems = inventory.filter(item => item.userId === req.user.id);
  
  const statsByType = {};
  userItems.forEach(item => {
    if (!statsByType[item.itemType]) {
      statsByType[item.itemType] = { count: 0, totalQuantity: 0, totalValue: 0 };
    }
    statsByType[item.itemType].count++;
    statsByType[item.itemType].totalQuantity += item.quantity;
    statsByType[item.itemType].totalValue += item.quantity * item.value;
  });
  
  const totalItems = userItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = userItems.reduce((sum, item) => sum + (item.quantity * item.value), 0);
  
  res.json({
    success: true,
    data: {
      byType: Object.entries(statsByType).map(([type, stats]) => ({
        _id: type,
        ...stats
      })),
      totalItems,
      totalValue
    }
  });
});

// 获取单个物品详情
app.get('/api/inventory/:id', protect, (req, res) => {
  const itemId = parseInt(req.params.id);
  const item = inventory.find(i => i.id === itemId);
  
  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }
  
  // 检查权限
  const isOwner = item.userId === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: '无权访问此物品' });
  }
  
  res.json({
    success: true,
    data: item
  });
});

// 添加新物品（仅管理员）
app.post('/api/inventory', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { itemName, itemType, quantity, condition, value, description, tags } = req.body;
  
  if (!itemName || quantity === undefined) {
    return res.status(400).json({ message: '物品名称和数量是必填项' });
  }
  
  if (quantity < 0) {
    return res.status(400).json({ message: '数量不能为负数' });
  }
  
  const newItem = {
    id: inventoryId++,
    userId: req.user.id,
    itemName,
    itemType: itemType || 'card',
    quantity,
    condition: condition || 'near_mint',
    value: value || 0,
    description: description || '',
    tags: tags || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  inventory.push(newItem);
  
  res.status(201).json({
    success: true,
    message: '物品添加成功',
    data: newItem
  });
});

// 更新物品
app.put('/api/inventory/:id', protect, (req, res) => {
  const itemId = parseInt(req.params.id);
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ message: '物品不存在' });
  }
  
  const item = inventory[itemIndex];
  
  // 检查权限
  const isOwner = item.userId === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: '无权修改此物品' });
  }
  
  // 普通用户只能修改自己的物品，且只能修改数量
  if (req.user.role === 'user') {
    if (!isOwner) {
      return res.status(403).json({ message: '只能修改自己的物品' });
    }
    
    // 检查是否只修改了数量字段
    const allowedFields = ['quantity'];
    const requestedFields = Object.keys(req.body);
    const hasInvalidFields = requestedFields.some(field => !allowedFields.includes(field));
    
    if (hasInvalidFields) {
      return res.status(403).json({ message: '普通用户只能修改数量' });
    }
  }
  
  // 更新字段（根据角色）
  if (isAdmin) {
    // 管理员可以修改所有字段
    const { itemName, itemType, quantity, condition, value, description, tags } = req.body;
    if (itemName) item.itemName = itemName;
    if (itemType) item.itemType = itemType;
    if (quantity !== undefined) {
      if (quantity < 0) {
        return res.status(400).json({ message: '数量不能为负数' });
      }
      item.quantity = quantity;
    }
    if (condition) item.condition = condition;
    if (value !== undefined) item.value = value;
    if (description !== undefined) item.description = description;
    if (tags) item.tags = tags;
  } else {
    // 普通用户只能修改数量
    if (req.body.quantity !== undefined) {
      if (req.body.quantity < 0) {
        return res.status(400).json({ message: '数量不能为负数' });
      }
      item.quantity = req.body.quantity;
    }
  }
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: '无权修改此物品' });
  }
  
  item.updatedAt = new Date();
  
  res.json({
    success: true,
    message: '物品更新成功',
    data: item
  });
});

// 删除物品
app.delete('/api/inventory/:id', protect, (req, res) => {
  const itemId = parseInt(req.params.id);
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ message: '物品不存在' });
  }
  
  const item = inventory[itemIndex];
  
  // 检查权限
  const isOwner = item.userId === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: '无权删除此物品' });
  }
  
  inventory.splice(itemIndex, 1);
  
  res.json({
    success: true,
    message: '物品已删除'
  });
});

// 管理员查看指定用户的库存
app.get('/api/inventory/admin/users/:userId', protect, authorize('admin', 'superadmin'), (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  const targetUser = users.find(u => u.id === targetUserId);
  
  if (!targetUser) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  const userItems = inventory.filter(item => item.userId === targetUserId);
  
  res.json({
    success: true,
    user: {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email
    },
    count: userItems.length,
    data: userItems
  });
});

// 仪表板路由
app.get('/api/dashboard', protect, (req, res) => {
  res.json({
    success: true,
    message: `欢迎 ${req.user.username}! 这是受保护的路由。您的角色是: ${req.user.role}`,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('注意: 此版本使用内存存储，重启后数据会丢失');
  console.log('要使用MongoDB，请运行: npm start');
});
