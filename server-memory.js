const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const users = [];
let userId = 1;

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'default-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
      req.user = users.find(u => u.id === decoded.id);

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Unauthorized, invalid token' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Unauthorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Required role: ${roles.join(', ')}`
      });
    }
    next();
  };
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'Username must be 3-20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const isFirstUser = users.length === 0;
    const role = isFirstUser ? 'superadmin' : 'user';

    const newUser = {
      id: userId++,
      username,
      email,
      password: hashedPassword,
      role: role,
      permissions: {
        teams: true,
        shops: true,
        decks: true,
        inventory: true,
        marketplace: true,
        analytics: true,
        messages: true,
        friends: true,
        favorites: true,
      },
      createdAt: new Date()
    };

    users.push(newUser);

    res.status(201).json({
      success: true,
      data: {
        _id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions,
        token: generateToken(newUser.id)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Email or password incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email or password incorrect' });
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
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/auth/me', protect, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

app.get('/api/auth/users', protect, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const usersWithoutPassword = users.map(user => {
    const { password, ...rest } = user;
    return rest;
  });
  
  res.json({
    success: true,
    count: usersWithoutPassword.length,
    data: usersWithoutPassword
  });
});

app.put('/api/auth/users/:id/role', protect, (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const userId = parseInt(req.params.id);
  const { role } = req.body;
  
  if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  if (users[userIndex].id === req.user.id) {
    return res.status(400).json({ message: 'Cannot change your own role' });
  }
  
  users[userIndex].role = role;
  
  res.json({
    success: true,
    message: 'Role updated',
    data: users[userIndex]
  });
});

app.delete('/api/auth/users/:id', protect, (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const userId = parseInt(req.params.id);
  
  if (userId === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete yourself' });
  }
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  users.splice(userIndex, 1);
  
  res.json({
    success: true,
    message: 'User deleted'
  });
});

app.put('/api/auth/users/:id/permissions', protect, (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const userId = parseInt(req.params.id);
  const permissions = req.body;
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  const validPermissions = ['teams', 'shops', 'decks', 'inventory', 'marketplace', 'analytics', 'messages', 'friends', 'favorites'];
  
  for (const key of Object.keys(permissions)) {
    if (!validPermissions.includes(key)) {
      return res.status(400).json({ message: `Invalid permission: ${key}` });
    }
    if (typeof permissions[key] !== 'boolean') {
      return res.status(400).json({ message: `Permission ${key} must be a boolean` });
    }
    users[userIndex].permissions[key] = permissions[key];
  }
  
  res.json({
    success: true,
    message: 'Permissions updated',
    data: users[userIndex]
  });
});

const inventory = [];
let inventoryId = 1;

app.get('/api/inventory', protect, (req, res) => {
  const userItems = inventory.filter(item => item.userId === req.user.id);
  
  res.json({
    success: true,
    count: userItems.length,
    data: userItems
  });
});

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

app.get('/api/inventory/:id', protect, (req, res) => {
  const itemId = parseInt(req.params.id);
  const item = inventory.find(i => i.id === itemId);
  
  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }
  
  const isOwner = item.userId === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'No access' });
  }
  
  res.json({
    success: true,
    data: item
  });
});

app.post('/api/inventory', protect, (req, res) => {
  const { itemName, itemType, quantity, condition, value, description, tags } = req.body;
  
  if (!itemName || quantity === undefined) {
    return res.status(400).json({ message: 'Name and quantity required' });
  }
  
  if (quantity < 0) {
    return res.status(400).json({ message: 'Quantity cannot be negative' });
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
    message: 'Item added',
    data: newItem
  });
});

app.put('/api/inventory/:id', protect, (req, res) => {
  const itemId = parseInt(req.params.id);
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Item not found' });
  }
  
  const item = inventory[itemIndex];
  const isOwner = item.userId === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'No access' });
  }
  
  if (req.user.role === 'user') {
    if (!isOwner) {
      return res.status(403).json({ message: 'Can only edit your own items' });
    }
    const allowedFields = ['quantity'];
    const requestedFields = Object.keys(req.body);
    const hasInvalidFields = requestedFields.some(field => !allowedFields.includes(field));
    
    if (hasInvalidFields) {
      return res.status(403).json({ message: 'Regular users can only modify quantity' });
    }
  }
  
  if (isAdmin) {
    const { itemName, itemType, quantity, condition, value, description, tags } = req.body;
    if (itemName) item.itemName = itemName;
    if (itemType) item.itemType = itemType;
    if (quantity !== undefined) {
      if (quantity < 0) {
        return res.status(400).json({ message: 'Quantity cannot be negative' });
      }
      item.quantity = quantity;
    }
    if (condition) item.condition = condition;
    if (value !== undefined) item.value = value;
    if (description !== undefined) item.description = description;
    if (tags) item.tags = tags;
  } else {
    if (req.body.quantity !== undefined) {
      if (req.body.quantity < 0) {
        return res.status(400).json({ message: 'Quantity cannot be negative' });
      }
      item.quantity = req.body.quantity;
    }
  }
  
  item.updatedAt = new Date();
  
  res.json({
    success: true,
    message: 'Item updated',
    data: item
  });
});

app.delete('/api/inventory/:id', protect, (req, res) => {
  const itemId = parseInt(req.params.id);
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Item not found' });
  }
  
  const item = inventory[itemIndex];
  const isOwner = item.userId === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'No access' });
  }
  
  inventory.splice(itemIndex, 1);
  
  res.json({
    success: true,
    message: 'Item deleted'
  });
});

const teams = [];
let teamId = 1;

app.post('/api/teams', protect, (req, res) => {
  const { name, description } = req.body;
  
  if (!name || name.length < 2) {
    return res.status(400).json({ message: 'Team name must be at least 2 characters' });
  }

  const existingTeam = teams.find(t => t.name === name);
  if (existingTeam) {
    return res.status(400).json({ message: 'Team name already exists' });
  }

  const newTeam = {
    id: teamId++,
    name,
    description: description || '',
    owner: req.user.id,
    members: [{
      user: req.user.id,
      role: 'leader',
      username: req.user.username
    }],
    settings: { isPublic: true, allowJoinRequests: true },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  teams.push(newTeam);

  res.status(201).json({
    success: true,
    message: 'Team created',
    data: newTeam
  });
});

app.get('/api/teams', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let filteredTeams = teams;
  
  if (req.query.search) {
    filteredTeams = teams.filter(t => 
      t.name.toLowerCase().includes(req.query.search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(req.query.search.toLowerCase()))
    );
  }

  if (req.query.isPublic !== undefined) {
    filteredTeams = filteredTeams.filter(t => t.settings.isPublic === (req.query.isPublic === 'true'));
  }

  const paginatedTeams = filteredTeams.slice(skip, skip + limit);

  res.json({
    success: true,
    count: paginatedTeams.length,
    total: filteredTeams.length,
    pages: Math.ceil(filteredTeams.length / limit),
    currentPage: page,
    data: paginatedTeams
  });
});

app.get('/api/teams/:id', protect, (req, res) => {
  const teamId = parseInt(req.params.id);
  const team = teams.find(t => t.id === teamId);
  
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  if (!team.settings.isPublic) {
    const isMember = team.members.some(m => m.user === req.user.id);
    const isOwner = team.owner === req.user.id;
    
    if (!isMember && !isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not a member' });
    }
  }

  res.json({
    success: true,
    data: team
  });
});

app.put('/api/teams/:id', protect, (req, res) => {
  const teamId = parseInt(req.params.id);
  const teamIndex = teams.findIndex(t => t.id === teamId);
  
  if (teamIndex === -1) {
    return res.status(404).json({ message: 'Team not found' });
  }

  const team = teams[teamIndex];
  
  if (team.owner !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'No permission' });
  }

  const { name, description, settings } = req.body;
  
  if (name) {
    const existingTeam = teams.find(t => t.name === name && t.id !== teamId);
    if (existingTeam) {
      return res.status(400).json({ message: 'Team name already exists' });
    }
    team.name = name;
  }
  
  if (description !== undefined) team.description = description;
  if (settings) team.settings = { ...team.settings, ...settings };
  team.updatedAt = new Date();

  res.json({
    success: true,
    message: 'Team updated',
    data: team
  });
});

app.delete('/api/teams/:id', protect, (req, res) => {
  const teamId = parseInt(req.params.id);
  const teamIndex = teams.findIndex(t => t.id === teamId);
  
  if (teamIndex === -1) {
    return res.status(404).json({ message: 'Team not found' });
  }

  const team = teams[teamIndex];
  
  if (team.owner !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'No permission' });
  }

  teams.splice(teamIndex, 1);

  res.json({
    success: true,
    message: 'Team deleted'
  });
});

app.post('/api/teams/:id/members', protect, (req, res) => {
  const teamId = parseInt(req.params.id);
  const team = teams.find(t => t.id === teamId);
  
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  const isMember = team.members.some(m => m.user === req.user.id);
  if (isMember) {
    return res.status(400).json({ message: 'Already a member' });
  }

  if (!team.settings.allowJoinRequests) {
    return res.status(400).json({ message: 'Join requests not allowed' });
  }

  team.members.push({
    user: req.user.id,
    role: 'member',
    username: req.user.username
  });
  team.updatedAt = new Date();

  res.status(201).json({
    success: true,
    message: 'Joined team',
    data: team
  });
});

app.put('/api/teams/:id/members/:userId/role', protect, (req, res) => {
  const teamId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  const { role } = req.body;
  
  const team = teams.find(t => t.id === teamId);
  
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  if (team.owner !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'No permission' });
  }

  const memberIndex = team.members.findIndex(m => m.user === userId);
  if (memberIndex === -1) {
    return res.status(404).json({ message: 'Member not found' });
  }

  team.members[memberIndex].role = role;
  team.updatedAt = new Date();

  res.json({
    success: true,
    message: 'Role updated',
    data: team
  });
});

app.delete('/api/teams/:id/members/:userId', protect, (req, res) => {
  const teamId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  
  const team = teams.find(t => t.id === teamId);
  
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  const isOwner = team.owner === req.user.id;
  const isSelf = userId === req.user.id;

  if (!isOwner && !isSelf) {
    return res.status(403).json({ message: 'No permission' });
  }

  team.members = team.members.filter(m => m.user !== userId);
  team.updatedAt = new Date();

  res.json({
    success: true,
    message: 'Member removed',
    data: team
  });
});

const shops = [];
let shopId = 1;

app.post('/api/shops', protect, (req, res) => {
  const { name, description, location, contactInfo, businessHours } = req.body;
  
  if (!name || name.length < 2) {
    return res.status(400).json({ message: '店铺名称需要2-100个字符' });
  }

  const existingShop = shops.find(s => s.name === name);
  if (existingShop) {
    return res.status(400).json({ message: '店铺名称已被使用' });
  }

  let locationData = location;
  if (typeof location === 'string') {
    locationData = { address: location };
  }

  const newShop = {
    id: shopId++,
    _id: shopId.toString(),
    name,
    description: description || '',
    owner: req.user.id,
    employees: [{
      user: req.user.id,
      role: 'manager',
      username: req.user.username,
      permissions: {
        canManageInventory: true,
        canRecordSales: true,
        canViewReports: true
      }
    }],
    location: locationData || {},
    contactInfo: contactInfo || {},
    businessHours: businessHours || {},
    settings: { isPublic: true, showSalesRecords: true },
    salesRecords: [],
    financialStats: {
      totalRevenue: 0,
      totalExpenses: 0,
      monthlyRevenue: 0,
      lastUpdated: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  shops.push(newShop);

  res.status(201).json({
    success: true,
    message: '店铺创建成功',
    data: newShop
  });
});

app.get('/api/shops', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let filteredShops = shops;
  
  if (req.query.search) {
    filteredShops = shops.filter(s => 
      s.name.toLowerCase().includes(req.query.search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(req.query.search.toLowerCase()))
    );
  }

  if (req.query.isPublic !== undefined) {
    filteredShops = filteredShops.filter(s => s.settings.isPublic === (req.query.isPublic === 'true'));
  }

  const paginatedShops = filteredShops.slice(skip, skip + limit);

  res.json({
    success: true,
    count: paginatedShops.length,
    total: filteredShops.length,
    pages: Math.ceil(filteredShops.length / limit),
    currentPage: page,
    data: paginatedShops
  });
});

app.get('/api/shops/:id', protect, (req, res) => {
  const shop = shops.find(s => s.id === parseInt(req.params.id) || s._id === req.params.id);
  
  if (!shop) {
    return res.status(404).json({ message: '店铺不存在' });
  }

  if (!shop.settings.isPublic) {
    const isEmployee = shop.employees.some(e => e.user === req.user.id);
    const isOwner = shop.owner === req.user.id;
    
    if (!isEmployee && !isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该店铺员工' });
    }
  }

  res.json({
    success: true,
    data: shop
  });
});

app.put('/api/shops/:id', protect, (req, res) => {
  const shopIndex = shops.findIndex(s => s.id === parseInt(req.params.id) || s._id === req.params.id);
  
  if (shopIndex === -1) {
    return res.status(404).json({ message: '店铺不存在' });
  }

  const shop = shops[shopIndex];
  
  if (shop.owner !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: '没有权限' });
  }

  const { name, description, location, contactInfo, businessHours, settings } = req.body;
  
  if (name) {
    const existingShop = shops.find(s => s.name === name && s.id !== shop.id);
    if (existingShop) {
      return res.status(400).json({ message: '店铺名称已被使用' });
    }
    shop.name = name;
  }
  
  if (description !== undefined) shop.description = description;
  if (location) shop.location = { ...shop.location, ...location };
  if (contactInfo) shop.contactInfo = { ...shop.contactInfo, ...contactInfo };
  if (businessHours) shop.businessHours = { ...shop.businessHours, ...businessHours };
  if (settings) shop.settings = { ...shop.settings, ...settings };
  shop.updatedAt = new Date();

  res.json({
    success: true,
    message: '店铺信息更新成功',
    data: shop
  });
});

app.delete('/api/shops/:id', protect, (req, res) => {
  const shopIndex = shops.findIndex(s => s.id === parseInt(req.params.id) || s._id === req.params.id);
  
  if (shopIndex === -1) {
    return res.status(404).json({ message: '店铺不存在' });
  }

  const shop = shops[shopIndex];
  
  if (shop.owner !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: '没有权限' });
  }

  shops.splice(shopIndex, 1);

  res.json({
    success: true,
    message: '店铺已关闭'
  });
});

app.get('/api/shops/:id/dashboard', protect, (req, res) => {
  const shop = shops.find(s => s.id === parseInt(req.params.id) || s._id === req.params.id);
  
  if (!shop) {
    return res.status(404).json({ message: '店铺不存在' });
  }

  const isEmployee = shop.employees.some(e => e.user === req.user.id);
  const isOwner = shop.owner === req.user.id;
  
  if (!isEmployee && !isOwner && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: '没有权限' });
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const todaySales = shop.salesRecords.filter(r => 
    new Date(r.soldAt) >= startOfDay && r.saleType === 'sell'
  ).reduce((sum, r) => sum + r.totalPrice, 0);

  const monthlySales = shop.salesRecords.filter(r => 
    new Date(r.soldAt) >= startOfMonth && r.saleType === 'sell'
  ).reduce((sum, r) => sum + r.totalPrice, 0);

  const transactionCount = shop.salesRecords.filter(r => 
    new Date(r.soldAt) >= startOfMonth
  ).length;

  res.json({
    success: true,
    data: {
      financialStats: shop.financialStats,
      todaySales,
      monthlySales,
      transactionCount,
      employeeCount: shop.employees.length,
      totalSalesRecords: shop.salesRecords.length
    }
  });
});

app.post('/api/shops/:id/employees', protect, (req, res) => {
  const shop = shops.find(s => s.id === parseInt(req.params.id) || s._id === req.params.id);
  
  if (!shop) {
    return res.status(404).json({ message: '店铺不存在' });
  }

  if (shop.owner !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: '没有权限' });
  }

  const { userId, role, permissions } = req.body;
  
  const isEmployee = shop.employees.some(e => e.user === userId);
  if (isEmployee) {
    return res.status(400).json({ message: '该用户已是店铺员工' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  shop.employees.push({
    user: userId,
    role: role || 'staff',
    username: user.username,
    permissions: permissions || {
      canManageInventory: false,
      canRecordSales: false,
      canViewReports: false
    }
  });

  shop.updatedAt = new Date();

  res.status(201).json({
    success: true,
    message: '员工添加成功',
    data: shop
  });
});

app.post('/api/shops/:id/sales', protect, (req, res) => {
  const shop = shops.find(s => s.id === parseInt(req.params.id) || s._id === req.params.id);
  
  if (!shop) {
    return res.status(404).json({ message: '店铺不存在' });
  }

  const isEmployee = shop.employees.some(e => e.user === req.user.id);
  const isOwner = shop.owner === req.user.id;
  
  if (!isEmployee && !isOwner) {
    return res.status(403).json({ message: '没有权限' });
  }

  const { item, quantity, unitPrice, saleType, customerName, notes } = req.body;
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({ message: '数量至少为1' });
  }
  
  if (unitPrice === undefined || unitPrice < 0) {
    return res.status(400).json({ message: '单价不能为负数' });
  }
  
  if (!['sell', 'buy', 'trade'].includes(saleType)) {
    return res.status(400).json({ message: '交易类型无效' });
  }

  const totalPrice = quantity * unitPrice;

  shop.salesRecords.push({
    item,
    quantity,
    unitPrice,
    totalPrice,
    saleType,
    customerName,
    soldBy: req.user.id,
    soldByUsername: req.user.username,
    notes,
    soldAt: new Date()
  });

  if (saleType === 'sell') {
    shop.financialStats.totalRevenue += totalPrice;
    shop.financialStats.monthlyRevenue += totalPrice;
  } else if (saleType === 'buy') {
    shop.financialStats.totalExpenses += totalPrice;
  }
  shop.financialStats.lastUpdated = new Date();

  res.status(201).json({
    success: true,
    message: '销售记录已添加',
    data: shop
  });
});

app.get('/api/shops/:id/sales', protect, (req, res) => {
  const shop = shops.find(s => s.id === parseInt(req.params.id) || s._id === req.params.id);
  
  if (!shop) {
    return res.status(404).json({ message: '店铺不存在' });
  }

  const isEmployee = shop.employees.some(e => e.user === req.user.id);
  const isOwner = shop.owner === req.user.id;
  
  if (!isEmployee && !isOwner) {
    return res.status(403).json({ message: '没有权限' });
  }

  let salesRecords = shop.salesRecords;
  
  if (req.query.saleType) {
    salesRecords = salesRecords.filter(r => r.saleType === req.query.saleType);
  }
  
  if (req.query.startDate) {
    const startDate = new Date(req.query.startDate);
    salesRecords = salesRecords.filter(r => new Date(r.soldAt) >= startDate);
  }
  
  if (req.query.endDate) {
    const endDate = new Date(req.query.endDate);
    salesRecords = salesRecords.filter(r => new Date(r.soldAt) <= endDate);
  }

  res.json({
    success: true,
    count: salesRecords.length,
    data: salesRecords
  });
});

app.get('/api/dashboard', protect, (req, res) => {
  res.json({
    success: true,
    message: `Welcome ${req.user.username}!`,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Note: Using in-memory storage, data will be lost on restart');
});