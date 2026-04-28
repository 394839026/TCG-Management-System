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
  
  if (req.body.quantity !== undefined) {
    if (req.body.quantity < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative' });
    }
    item.quantity = req.body.quantity;
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

  res.json({
    success: true,
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
  
  if (team.owner !== req.user.id) {
    return res.status(403).json({ message: 'No permission' });
  }

  teams.splice(teamIndex, 1);

  res.json({
    success: true,
    message: 'Team deleted'
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
});