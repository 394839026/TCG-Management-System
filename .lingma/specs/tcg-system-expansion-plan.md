# TCG卡牌管理系统 - 功能扩展实施计划

## 上下文

当前系统是一个基础的TCG卡牌库存管理应用,支持用户注册登录、卡牌CRUD操作和简单的角色权限(user/admin/superadmin)。本计划旨在将其扩展为一个功能完整的多用户类型卡牌管理系统,支持个人用户、战队和店铺三种不同类型的用户,并提供卡组管理、交易市场和数据分析等高级功能。

## 架构决策

根据用户需求确认:
1. **数据模型**: 独立模型+继承基础用户(User + Team/Shop)
2. **交易功能**: 进阶版(发布求购/出售信息+简单消息系统)
3. **权限管理**: ABAC(基于资源的访问控制)+RBAC混合模式
4. **前端架构**: 完整SPA框架重构(推荐Next.js 15+ App Router)

---

## 一、后端架构升级

### 1.1 数据库模型扩展

#### 新增模型文件

**models/Team.js** (战队模型)
```javascript
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, maxlength: 500 },
  logo: { type: String, default: '' }, // Logo URL
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { 
      type: String, 
      enum: ['leader', 'manager', 'member'], 
      default: 'member' 
    },
    joinedAt: { type: Date, default: Date.now },
    permissions: {
      canBorrowCards: { type: Boolean, default: false },
      canBorrowDecks: { type: Boolean, default: false },
      canManageInventory: { type: Boolean, default: false }
    }
  }],
  sharedInventory: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
    isAvailable: { type: Boolean, default: true },
    borrowedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    borrowedAt: Date,
    returnDate: Date
  }],
  sharedDecks: [{
    deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isAvailable: { type: Boolean, default: true }
  }],
  investmentRecords: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'] },
    date: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  settings: {
    isPublic: { type: Boolean, default: true },
    allowJoinRequests: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
```

**models/Shop.js** (店铺模型)
```javascript
const shopSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, maxlength: 1000 },
  logo: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  employees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { 
      type: String, 
      enum: ['manager', 'cashier', 'staff'], 
      default: 'staff' 
    },
    hiredAt: { type: Date, default: Date.now },
    permissions: {
      canManageInventory: { type: Boolean, default: false },
      canRecordSales: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false }
    }
  }],
  location: {
    address: String,
    city: String,
    province: String,
    postalCode: String
  },
  contactInfo: {
    phone: String,
    email: String,
    website: String,
    socialMedia: {
      wechat: String,
      qq: String
    }
  },
  businessHours: {
    openTime: String, // "09:00"
    closeTime: String, // "21:00"
    workdays: [String] // ["monday", "tuesday", ...]
  },
  salesRecords: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    saleType: { type: String, enum: ['sell', 'buy', 'trade'] },
    customerName: String,
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    soldAt: { type: Date, default: Date.now },
    notes: String
  }],
  financialStats: {
    totalRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  settings: {
    isPublic: { type: Boolean, default: true },
    showSalesRecords: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

shopSchema.index({ owner: 1 });
shopSchema.index({ 'employees.user': 1 });
```

**models/Deck.js** (卡组模型)
```javascript
const deckSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  game: { 
    type: String, 
    enum: ['yugioh', 'magic', 'pokemon', 'cardfight', 'other'],
    required: true 
  },
  format: { type: String, default: '' }, // Standard, Modern, etc.
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  cards: [{
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantity: { type: Number, required: true, min: 1 },
    sideboard: { type: Boolean, default: false } // 副卡组标记
  }],
  description: { type: String, maxlength: 1000 },
  tags: [{ type: String, trim: true }],
  isPublic: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 }
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

deckSchema.index({ owner: 1 });
deckSchema.index({ game: 1, format: 1 });
deckSchema.index({ isPublic: 1, createdAt: -1 });
```

**models/TradeListing.js** (交易挂牌模型)
```javascript
const tradeListingSchema = new mongoose.Schema({
  seller: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['sell', 'buy', 'trade'], 
    required: true 
  },
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantity: { type: Number, default: 1 },
    condition: String
  }],
  requestedItems: [{ // 用于交换或求购
    itemName: { type: String, required: true },
    rarity: String,
    quantity: { type: Number, default: 1 }
  }],
  price: { type: Number, min: 0 }, // 售价或求购价
  status: { 
    type: String, 
    enum: ['active', 'pending', 'completed', 'cancelled'], 
    default: 'active' 
  },
  views: { type: Number, default: 0 },
  interestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

tradeListingSchema.index({ seller: 1, status: 1 });
tradeListingSchema.index({ type: 1, status: 1 });
tradeListingSchema.index({ createdAt: -1 });
```

**models/TradeMessage.js** (交易消息模型)
```javascript
const tradeMessageSchema = new mongoose.Schema({
  listing: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TradeListing', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { type: String, required: true, maxlength: 1000 },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

tradeMessageSchema.index({ listing: 1 });
tradeMessageSchema.index({ sender: 1, receiver: 1 });
```

**models/Friendship.js** (好友关系模型)
```javascript
const friendshipSchema = new mongoose.Schema({
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  addressee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'blocked'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

friendshipSchema.index({ requester: 1, addressee: 1 }, { unique: true });
friendshipSchema.index({ addressee: 1, status: 1 });
```

#### 修改现有模型

**models/User.js** 需要添加的字段:
```javascript
// 在现有schema中添加
userType: {
  type: String,
  enum: ['personal', 'team', 'shop'],
  default: 'personal'
},
teams: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Team'
}],
shops: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Shop'
}],
friends: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}],
wishlist: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'InventoryItem'
}],
lastLogin: Date,
loginHistory: [{
  ip: String,
  userAgent: String,
  loginAt: { type: Date, default: Date.now }
}]
```

**models/Inventory.js** 需要添加的字段:
```javascript
// 扩展现有schema
images: [String],
acquisitionDate: Date,
acquisitionPrice: Number,
acquisitionSource: String,
isFavorite: { type: Boolean, default: false },
isWishlist: { type: Boolean, default: false },
tradeHistory: [{
  type: { type: String, enum: ['buy', 'sell', 'trade'] },
  price: Number,
  date: Date,
  counterparty: String,
  notes: String
}],
setName: String,
setNumber: String,
language: { type: String, default: 'zh' },
foil: { type: Boolean, default: false },
graded: {
  company: String,
  grade: String,
  certificationNumber: String
},
storageLocation: String,
owner: { // 所有权转移历史
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}
```

---

### 1.2 API端点扩展

#### 认证模块扩展 (`routes/auth.js`)

新增端点:
```javascript
// 密码重置
POST   /api/auth/forgot-password     // 发送重置邮件(可选,先实现token方式)
POST   /api/auth/reset-password      // 重置密码

// 会话管理
GET    /api/auth/sessions            // 获取活跃会话
DELETE /api/auth/sessions/:id        // 撤销会话

// 好友系统
GET    /api/auth/friends             // 获取好友列表
POST   /api/auth/friends/:userId     // 发送好友请求
DELETE /api/auth/friends/:userId     // 删除好友
GET    /api/auth/friends/pending     // 待处理请求
PUT    /api/auth/friends/:userId/accept  // 接受请求
PUT    /api/auth/friends/:userId/reject  // 拒绝请求

// 用户资料扩展
GET    /api/auth/users/:userId/public-profile  // 获取公开资料
```

#### 战队管理模块 (`routes/team.js` - 新建)

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Team = require('../models/Team');
const { body, validationResult } = require('express-validator');

// 战队CRUD
POST   /api/teams                     // 创建战队 (personal用户)
GET    /api/teams                     // 获取战队列表(支持搜索/分页)
GET    /api/teams/:id                 // 获取战队详情
PUT    /api/teams/:id                 // 更新战队信息 (owner/manager)
DELETE /api/teams/:id                 // 解散战队 (仅owner)

// 成员管理
POST   /api/teams/:id/members         // 申请加入战队
PUT    /api/teams/:id/members/:userId/accept  // 接受加入申请 (owner/manager)
PUT    /api/teams/:id/members/:userId/reject  // 拒绝加入申请
PUT    /api/teams/:id/members/:userId/role    // 修改成员角色 (仅owner)
DELETE /api/teams/:id/members/:userId         // 移除成员 (owner/self)

// 共享库存管理
POST   /api/teams/:id/shared-inventory        // 添加物品到共享库存
PUT    /api/teams/:id/shared-inventory/:itemId/borrow  // 借用物品
PUT    /api/teams/:id/shared-inventory/:itemId/return  // 归还物品
DELETE /api/teams/:id/shared-inventory/:itemId        // 从共享库存移除

// 共享卡组
POST   /api/teams/:id/shared-decks              // 添加卡组到共享
DELETE /api/teams/:id/shared-decks/:deckId      // 移除共享卡组

// 投资管理
POST   /api/teams/:id/investments               // 记录投资收支
GET    /api/teams/:id/investments               // 获取投资记录
GET    /api/teams/:id/financial-summary         // 获取财务摘要

// 权限管理 (ABAC)
PUT    /api/teams/:id/members/:userId/permissions  // 设置成员权限
```

#### 店铺管理模块 (`routes/shop.js` - 新建)

```javascript
// 店铺CRUD
POST   /api/shops                     // 创建店铺 (personal用户)
GET    /api/shops                     // 获取店铺列表
GET    /api/shops/:id                 // 获取店铺详情
PUT    /api/shops/:id                 // 更新店铺信息 (owner/manager)
DELETE /api/shops/:id                 // 关闭店铺 (仅owner)

// 员工管理
POST   /api/shops/:id/employees       // 添加员工
PUT    /api/shops/:id/employees/:userId/role     // 修改员工角色
PUT    /api/shops/:id/employees/:userId/permissions  // 设置权限
DELETE /api/shops/:id/employees/:userId          // 移除员工

// 销售记录
POST   /api/shops/:id/sales           // 记录销售/收购
GET    /api/shops/:id/sales           // 获取销售记录(支持筛选)
GET    /api/shops/:id/sales/stats     // 获取销售统计

// 经营看板
GET    /api/shops/:id/dashboard       // 获取经营看板数据
GET    /api/shops/:id/analytics       // 获取数据分析报表
```

#### 卡组管理模块 (`routes/deck.js` - 新建)

```javascript
// 卡组CRUD
POST   /api/decks                     // 创建卡组
GET    /api/decks                     // 获取我的卡组列表
GET    /api/decks/:id                 // 获取卡组详情
PUT    /api/decks/:id                 // 更新卡组
DELETE /api/decks/:id                 // 删除卡组

// 卡组卡片管理
POST   /api/decks/:id/cards           // 添加卡牌到卡组
PUT    /api/decks/:id/cards/:cardId   // 更新卡牌数量
DELETE /api/decks/:id/cards/:cardId   // 从卡组移除卡牌

// 公共卡组
GET    /api/decks/public              // 获取公共卡组
POST   /api/decks/:id/share           // 分享卡组为公共
DELETE /api/decks/:id/share           // 取消分享

// 卡组验证
GET    /api/decks/:id/validate        // 验证卡组合法性(规则检查)

// 收藏与点赞
POST   /api/decks/:id/favorite        // 收藏卡组
DELETE /api/decks/:id/favorite        // 取消收藏
POST   /api/decks/:id/like            // 点赞卡组
DELETE /api/decks/:id/like            // 取消点赞
```

#### 交易市场模块 (`routes/trade.js` - 新建)

```javascript
// 交易挂牌
POST   /api/trade/listings            // 发布交易信息
GET    /api/trade/listings            // 获取交易列表(支持筛选)
GET    /api/trade/listings/:id        // 获取交易详情
PUT    /api/trade/listings/:id        // 更新交易信息
DELETE /api/trade/listings/:id        // 取消交易

// 我的交易
GET    /api/trade/my-listings         // 我发布的交易
GET    /api/trade/interested          // 我感兴趣的交易

// 交易消息
POST   /api/trade/messages            // 发送交易消息
GET    /api/trade/messages/:listingId // 获取交易对话
PUT    /api/trade/messages/:id/read   // 标记已读

// 交易响应
POST   /api/trade/listings/:id/respond  // 回应交易(表示兴趣)
POST   /api/trade/listings/:id/complete // 完成交易
```

#### 库存模块扩展 (`routes/inventory.js`)

新增端点:
```javascript
// 图片上传
POST   /api/inventory/:id/image       // 上传物品图片 (使用multer)
DELETE /api/inventory/:id/images/:index  // 删除图片

// 批量操作
POST   /api/inventory/bulk-create     // 批量添加物品
POST   /api/inventory/bulk-update     // 批量更新物品
POST   /api/inventory/bulk-delete     // 批量删除物品

// 高级搜索
GET    /api/inventory/search          // 高级搜索(多条件筛选)

// 收藏与愿望单
GET    /api/inventory/favorites       // 获取收藏列表
POST   /api/inventory/:id/favorite    // 添加收藏
DELETE /api/inventory/:id/favorite    // 取消收藏

GET    /api/inventory/wishlist        // 获取愿望单
POST   /api/inventory/:id/wishlist    // 添加到愿望单
DELETE /api/inventory/:id/wishlist    // 从愿望单移除

// 交易历史
GET    /api/inventory/:id/history     // 获取物品交易历史
POST   /api/inventory/:id/transfer    // 转移物品所有权(赠与/交换)

// 数据导出
GET    /api/inventory/export          // 导出数据(CSV/JSON)
```

#### 数据分析模块 (`routes/analytics.js` - 新建)

```javascript
// 库存分析
GET    /api/analytics/inventory       // 库存分析报告
GET    /api/analytics/value-trend     // 价值趋势图表数据
GET    /api/analytics/collection-progress  // 收藏完成度

// 支出分析
GET    /api/analytics/spending        // 支出统计
GET    /api/analytics/spending/monthly  // 月度支出

// 交易分析
GET    /api/analytics/trades          // 交易统计分析

// 报告导出
POST   /api/analytics/export          // 导出分析报告(PDF)
```

---

### 1.3 中间件扩展

**middleware/abac.js** (新建 - ABAC权限控制)
```javascript
/**
 * ABAC权限检查中间件工厂
 * @param {Object} options - 权限配置
 * @param {String} options.resource - 资源类型 ('team', 'shop', 'deck', etc.)
 * @param {Array} options.actions - 允许的操作 ('read', 'write', 'delete', 'manage')
 * @param {Function} options.checkOwnership - 自定义所有权检查函数
 */
const abac = (options) => {
  return async (req, res, next) => {
    const user = req.user;
    const resourceId = req.params.id || req.params.teamId || req.params.shopId;
    
    try {
      // 超级管理员拥有所有权限
      if (user.role === 'superadmin') {
        return next();
      }
      
      // 检查资源所有权或成员资格
      const hasPermission = await checkResourcePermission(user, resourceId, options);
      
      if (!hasPermission) {
        return res.status(403).json({
          message: '您没有权限执行此操作'
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ message: '权限检查失败' });
    }
  };
};

async function checkResourcePermission(user, resourceId, options) {
  const { resource } = options;
  
  switch (resource) {
    case 'team':
      return await checkTeamPermission(user, resourceId, options.actions);
    case 'shop':
      return await checkShopPermission(user, resourceId, options.actions);
    case 'deck':
      return await checkDeckPermission(user, resourceId, options.actions);
    case 'inventory':
      return await checkInventoryPermission(user, resourceId, options.actions);
    default:
      return false;
  }
}

async function checkTeamPermission(user, teamId, actions) {
  const Team = require('../models/Team');
  const team = await Team.findById(teamId);
  
  if (!team) return false;
  
  // 所有者拥有所有权限
  if (team.owner.toString() === user._id.toString()) {
    return true;
  }
  
  // 检查成员权限
  const member = team.members.find(m => m.user.toString() === user._id.toString());
  if (!member) return false;
  
  // 根据角色和操作判断权限
  if (actions.includes('read')) {
    return true; // 所有成员可读
  }
  
  if (actions.includes('write')) {
    return member.role === 'leader' || 
           member.role === 'manager' || 
           member.permissions.canManageInventory;
  }
  
  if (actions.includes('manage')) {
    return member.role === 'leader'; // 仅队长可管理
  }
  
  return false;
}

async function checkShopPermission(user, shopId, actions) {
  const Shop = require('../models/Shop');
  const shop = await Shop.findById(shopId);
  
  if (!shop) return false;
  
  // 所有者拥有所有权限
  if (shop.owner.toString() === user._id.toString()) {
    return true;
  }
  
  // 检查员工权限
  const employee = shop.employees.find(e => e.user.toString() === user._id.toString());
  if (!employee) return false;
  
  if (actions.includes('read')) {
    return employee.permissions.canViewReports || actions.length === 1;
  }
  
  if (actions.includes('write')) {
    return employee.role === 'manager' || 
           employee.permissions.canManageInventory ||
           employee.permissions.canRecordSales;
  }
  
  if (actions.includes('manage')) {
    return employee.role === 'manager';
  }
  
  return false;
}

module.exports = abac;
```

**middleware/upload.js** (新建 - 文件上传处理)
```javascript
const multer = require('multer');
const path = require('path');

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤
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

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: fileFilter
});

module.exports = upload;
```

---

### 1.4 服务器配置更新

**server.js** 需要添加的路由挂载:
```javascript
// 在现有路由后添加
app.use('/api/teams', require('./routes/team'));
app.use('/api/shops', require('./routes/shop'));
app.use('/api/decks', require('./routes/deck'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/analytics', require('./routes/analytics'));

// 静态文件服务扩展
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
```

---

## 二、前端架构重构 (Next.js 15+)

### 2.1 项目初始化

```bash
npx create-next-app@latest tcg-frontend --typescript --tailwind --app
cd tcg-frontend
npm install @supabase/ssr @tanstack/react-query zustand axios lucide-react
npm install recharts framer-motion react-hook-form zod @hookform/resolvers
```

### 2.2 目录结构

```
tcg-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx (包含侧边栏和顶部导航)
│   │   ├── dashboard/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── add/page.tsx
│   │   ├── decks/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── builder/page.tsx
│   │   ├── teams/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── create/page.tsx
│   │   ├── shops/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── create/page.tsx
│   │   ├── trade/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── create/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx
│   ├── api/ (Server Actions)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/ (通用UI组件)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Form.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── inventory/
│   │   ├── InventoryCard.tsx
│   │   ├── InventoryList.tsx
│   │   ├── AddItemForm.tsx
│   │   └── EditItemModal.tsx
│   ├── deck/
│   │   ├── DeckBuilder.tsx
│   │   ├── DeckCard.tsx
│   │   └── DeckList.tsx
│   └── trade/
│       ├── TradeListing.tsx
│       └── TradeMessage.tsx
├── lib/
│   ├── api.ts (API客户端)
│   ├── auth.ts (认证工具)
│   └── utils.ts
├── stores/
│   ├── useAuthStore.ts (Zustand状态管理)
│   └── useInventoryStore.ts
├── types/
│   ├── user.ts
│   ├── inventory.ts
│   ├── team.ts
│   └── trade.ts
└── middleware.ts (Next.js中间件)
```

### 2.3 核心组件示例

**stores/useAuthStore.ts** (Zustand状态管理)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  userType: 'personal' | 'team' | 'shop';
  avatar?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true 
      }),
      
      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false 
      }),
      
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      }))
    }),
    {
      name: 'auth-storage'
    }
  )
);
```

**lib/api.ts** (API客户端)
```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 自动附加token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**components/ui/Button.tsx** (通用按钮组件)
```typescript
'use client';

import { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:-translate-y-0.5',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-2 border-gray-200',
        success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg',
        ghost: 'hover:bg-gray-100 text-gray-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    }
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, 
  VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

---

## 三、实施阶段划分

### 阶段一: 基础架构搭建 (优先级: 高)

**目标**: 建立新的数据模型和基础API

**任务清单**:
1. ✅ 创建新的Mongoose模型 (Team, Shop, Deck, TradeListing, TradeMessage, Friendship)
2. ✅ 扩展现有模型 (User, Inventory)
3. ✅ 实现ABAC权限中间件
4. ✅ 配置文件上传中间件 (multer)
5. ✅ 创建基础API路由骨架 (team.js, shop.js, deck.js, trade.js, analytics.js)
6. ✅ 更新server.js挂载新路由
7. ✅ 创建uploads目录和静态文件服务

**验收标准**:
- 所有新模型可以通过Mongoose验证
- API端点返回正确的HTTP状态码
- 权限中间件正确阻止未授权访问
- 文件上传功能正常工作

---

### 阶段二: 核心业务逻辑 (优先级: 高)

**目标**: 实现战队、店铺、卡组的核心CRUD功能

**任务清单**:
1. ✅ 战队管理API完整实现
   - 创建/编辑/删除战队
   - 成员管理(申请/接受/拒绝/移除)
   - 共享库存管理(添加/借用/归还)
   - 投资记录管理
   
2. ✅ 店铺管理API完整实现
   - 创建/编辑/删除店铺
   - 员工管理
   - 销售记录管理
   - 经营看板数据聚合

3. ✅ 卡组管理API完整实现
   - 卡组CRUD
   - 卡组卡片管理
   - 公共卡组分享
   - 收藏和点赞功能

4. ✅ 库存模块扩展
   - 图片上传功能
   - 批量操作API
   - 高级搜索
   - 收藏和愿望单
   - 所有权转移(赠与/交换)

**验收标准**:
- 所有CRUD操作通过测试
- ABAC权限控制正确生效
- 数据聚合查询性能合理(<500ms)
- 图片上传大小和格式限制生效

---

### 阶段三: 交易市场功能 (优先级: 中)

**目标**: 实现卡牌交易和消息系统

**任务清单**:
1. ✅ 交易挂牌API
   - 发布出售/求购/交换信息
   - 更新/取消挂牌
   - 浏览和筛选交易列表
   
2. ✅ 交易消息系统
   - 发送/接收消息
   - 消息已读标记
   - 按交易分组的对话列表

3. ✅ 好友系统
   - 发送/接受/拒绝好友请求
   - 好友列表管理
   - 查看好友公开库存(需授权)

4. ✅ 交易响应功能
   - 表示兴趣
   - 完成交易标记
   - 交易历史记录

**验收标准**:
- 交易挂牌可以正确创建和查询
- 消息系统支持实时对话(先实现polling,后续可升级为WebSocket)
- 好友关系正确建立和管理
- 交易流程完整闭环

---

### 阶段四: 数据分析功能 (优先级: 中)

**目标**: 提供库存分析和报表功能

**任务清单**:
1. ✅ 库存分析API
   - 按稀有度/类型分布统计
   - 价值趋势计算
   - 收藏完成度分析

2. ✅ 支出分析API
   - 月度/年度支出统计
   - 投资回报率计算
   - 支出分类统计

3. ✅ 交易分析API
   - 交易频率统计
   - 热门交易卡牌排行
   - 交易收益分析

4. ✅ 报告导出功能
   - CSV导出
   - JSON导出
   - PDF报告生成(使用pdfkit或puppeteer)

**验收标准**:
- 数据聚合查询准确无误
- 大数据量下查询性能可接受(<1s)
- 导出文件格式正确
- 图表数据格式符合前端要求

---

### 阶段五: 前端重构 (优先级: 高)

**目标**: 使用Next.js重建完整的前端应用

**任务清单**:
1. ✅ Next.js项目初始化和配置
2. ✅ 认证页面 (登录/注册/密码重置)
3. ✅ 布局组件 (侧边栏/顶部导航/页脚)
4. ✅ 仪表板页面
5. ✅ 库存管理页面
   - 卡片视图/列表视图切换
   - 添加/编辑物品表单
   - 图片上传组件
   - 批量操作UI
   
6. ✅ 卡组管理页面
   - 卡组列表
   - 卡组构建器(拖拽式界面)
   - 卡组详情页
   
7. ✅ 战队管理页面
   - 战队列表和搜索
   - 战队详情页
   - 成员管理界面
   - 共享库存管理
   
8. ✅ 店铺管理页面
   - 店铺列表
   - 店铺详情页
   - 销售记录表格
   - 经营看板图表(使用recharts)
   
9. ✅ 交易市场页面
   - 交易列表和筛选
   - 交易详情页
   - 发布交易表单
   - 消息对话界面
   
10. ✅ 数据分析页面
    - 库存分析图表
    - 支出趋势图
    - 交易统计
    
11. ✅ 设置页面
    - 个人资料编辑
    - 主题切换
    - 偏好设置

**验收标准**:
- 所有页面无JavaScript错误
- 响应式设计适配移动端
- 表单验证完整
- 加载状态和错误提示友好
- SEO优化(meta标签/结构化数据)

---

### 阶段六: 测试和优化 (优先级: 中)

**目标**: 确保系统稳定性和性能

**任务清单**:
1. ⬜ 编写单元测试 (Jest + Supertest)
   - 模型验证测试
   - API端点测试
   - 中间件测试
   
2. ⬜ 集成测试
   - 完整业务流程测试
   - 权限控制测试
   
3. ⬜ 性能优化
   - 数据库索引优化
   - API响应缓存(Redis)
   - 前端代码分割和懒加载
   
4. ⬜ 安全加固
   - 速率限制(express-rate-limit)
   - SQL注入防护(已由Mongoose处理)
   - XSS防护(前端DOMPurify)
   - CSRF保护
   
5. ⬜ 文档完善
   - API文档(Swagger/OpenAPI)
   - 部署文档
   - 用户使用手册

**验收标准**:
- 测试覆盖率>80%
- API响应时间P95<300ms
- 无已知安全漏洞
- 完整的文档覆盖

---

## 四、关键文件路径

### 后端文件

**新增模型**:
- `models/Team.js`
- `models/Shop.js`
- `models/Deck.js`
- `models/TradeListing.js`
- `models/TradeMessage.js`
- `models/Friendship.js`

**修改模型**:
- `models/User.js` (添加userType, teams, shops, friends等字段)
- `models/Inventory.js` (添加images, acquisitionDate, tradeHistory等字段)

**新增路由**:
- `routes/team.js`
- `routes/shop.js`
- `routes/deck.js`
- `routes/trade.js`
- `routes/analytics.js`
- `routes/notification.js`
- `routes/activity.js`

**修改路由**:
- `routes/auth.js` (添加好友系统和会话管理端点)
- `routes/inventory.js` (添加图片上传、批量操作、收藏等功能)

**新增中间件**:
- `middleware/abac.js`
- `middleware/upload.js`

**修改服务器**:
- `server.js` (挂载新路由和静态文件服务)

### 前端文件

由于是全新项目,所有文件均为新建:
- `tcg-frontend/app/**/*` (Next.js页面和布局)
- `tcg-frontend/components/**/*` (React组件)
- `tcg-frontend/lib/**/*` (工具函数和API客户端)
- `tcg-frontend/stores/**/*` (Zustand状态管理)
- `tcg-frontend/types/**/*` (TypeScript类型定义)

---

## 五、验证和测试策略

### 5.1 后端测试

**手动测试脚本**:
```bash
# 创建测试数据
node scripts/create-test-data.js

# 测试战队功能
node test-team-api.js

# 测试店铺功能
node test-shop-api.js

# 测试卡组功能
node test-deck-api.js

# 测试交易功能
node test-trade-api.js
```

**自动化测试** (阶段六实施):
```bash
npm test  # 运行Jest测试套件
npm run test:coverage  # 生成覆盖率报告
```

### 5.2 前端测试

**开发环境测试**:
```bash
cd tcg-frontend
npm run dev  # 启动开发服务器
# 访问 http://localhost:3001
```

**生产构建测试**:
```bash
npm run build  # 构建生产版本
npm run start  # 启动生产服务器
```

**端到端测试** (可选,使用Playwright):
```bash
npm run test:e2e
```

### 5.3 集成测试场景

1. **完整用户流程**:
   - 注册 → 登录 → 创建战队 → 添加成员 → 共享库存 → 创建卡组 → 发布交易

2. **权限控制验证**:
   - 普通用户尝试访问管理员功能 → 应被拒绝
   - 战队成员尝试管理非自己战队 → 应被拒绝
   - 店铺员工尝试查看财务报告(无权限) → 应被拒绝

3. **数据一致性**:
   - 删除用户后,其创建的战队/店铺应正确处理(转移或删除)
   - 物品所有权转移后,相关卡组应正确更新引用

---

## 六、迁移策略

### 6.1 数据迁移

由于是功能扩展而非重写,现有数据需要迁移:

**migration script** (`scripts/migrate-users.js`):
```javascript
const mongoose = require('mongoose');
const User = require('../models/User');

async function migrateUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // 为所有现有用户添加默认userType
  await User.updateMany(
    { userType: { $exists: false } },
    { $set: { userType: 'personal' } }
  );
  
  console.log('用户迁移完成');
  process.exit(0);
}

migrateUsers();
```

### 6.2 前端迁移

由于采用全新的Next.js前端,建议:
1. 保留旧前端(`public/`目录)作为备份
2. 新前端部署在不同端口或子域名
3. 逐步迁移用户,先内部测试再全面切换
4. 提供回滚方案

---

## 七、部署建议

### 7.1 环境要求

- Node.js >= 18.x
- MongoDB >= 6.0
- 至少2GB RAM (生产环境建议4GB+)
- SSD存储(提升数据库性能)

### 7.2 环境变量配置

**.env.production**:
```env
# 服务器
PORT=3000
NODE_ENV=production

# 数据库
MONGODB_URI=mongodb://username:password@localhost:27017/tcg-system

# JWT
JWT_SECRET=your-super-secret-key-at-least-32-characters
JWT_EXPIRE=7d

# 文件上传
UPLOAD_DIR=/var/www/tcg/uploads
MAX_FILE_SIZE=5242880

# CORS
CORS_ORIGIN=https://yourdomain.com

# 前端URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### 7.3 进程管理

使用PM2管理Node.js进程:
```bash
npm install -g pm2
pm2 start server.js --name tcg-api
pm2 startup
pm2 save
```

### 7.4 Nginx反向代理

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        proxy_pass http://localhost:3001;  # Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## 八、风险评估和缓解

### 8.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| MongoDB性能瓶颈 | 高 | 中 | 提前优化索引,引入Redis缓存 |
| 文件存储空间不足 | 中 | 低 | 定期清理,考虑云存储(OSS/S3) |
| Next.js学习曲线 | 中 | 高 | 提供详细文档和示例代码 |
| ABAC权限逻辑复杂 | 高 | 中 | 充分测试,编写单元测试 |

### 8.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 功能过于复杂导致用户体验差 | 高 | 中 | 分阶段发布,收集用户反馈 |
| 交易市场活跃度低 | 中 | 高 | 初期提供激励措施,简化交易流程 |
| 数据安全问题 | 高 | 低 | 定期安全审计,加密敏感数据 |

---

## 九、成功指标

### 9.1 技术指标
- API响应时间P95 < 300ms
- 页面加载时间 < 2s
- 测试覆盖率 > 80%
- 零严重安全漏洞

### 9.2 业务指标
- 支持1000+并发用户
- 单日交易撮合数 > 100
- 用户留存率(7日) > 40%
- 平均会话时长 > 10分钟

---

## 十、新增功能模块

### 10.1 消息通知服务
**目标**: 实现完善的多渠道通知系统

**功能特性**:
- 站内通知（已实现）
- 邮件通知（交易提醒、好友请求、系统公告）
- 推送通知（浏览器推送、移动端推送）
- 通知偏好设置（用户可自定义接收渠道）

**技术实现**:
```javascript
// 通知服务示例
class NotificationService {
  async sendEmail(to, subject, content) {
    // 使用nodemailer或SendGrid发送邮件
  }
  
  async sendPushNotification(userId, payload) {
    // 使用Web Push API或Firebase Cloud Messaging
  }
  
  async createNotification(recipient, type, title, content, payload) {
    // 创建数据库通知记录
  }
}
```

---

### 10.2 卡牌价格追踪
**目标**: 提供卡牌市场价格趋势分析

**功能特性**:
- 实时价格抓取（对接外部卡牌交易平台）
- 价格历史图表
- 价格提醒（设置目标价格自动通知）
- 市场行情分析报告

**数据模型扩展**:
```javascript
// models/PriceHistory.js
const priceHistorySchema = new mongoose.Schema({
  cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  price: { type: Number, required: true },
  source: { type: String }, // 价格来源
  currency: { type: String, default: 'CNY' },
  timestamp: { type: Date, default: Date.now }
});
```

---

### 10.3 成就系统
**目标**: 增加用户活跃度和参与感

**功能特性**:
- 成就徽章系统
- 等级进度追踪
- 排行榜展示
- 成就奖励机制

**数据模型**:
```javascript
// models/Achievement.js
const achievementSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  icon: { type: String },
  type: { type: String, enum: ['collection', 'trade', 'social', 'rare'] },
  requirement: { type: Object }, // 达成条件
  rewards: { type: Object }, // 奖励内容
  createdAt: { type: Date, default: Date.now }
});

// models/UserAchievement.js
const userAchievementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  progress: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
  claimed: { type: Boolean, default: false }
});
```

---

### 10.4 卡牌扫描识别
**目标**: 支持通过摄像头快速识别卡牌

**功能特性**:
- 移动端摄像头扫描
- OCR文字识别
- 卡牌信息自动填充
- 批量录入支持

**技术方案**:
- 使用 Tesseract.js 进行OCR识别
- 调用外部卡牌数据库API匹配卡牌信息
- 支持拍照上传识别

---

### 10.5 数据统计仪表盘
**目标**: 为管理员提供全面的数据监控

**功能特性**:
- 用户增长趋势
- 交易活跃度统计
- 库存数据汇总
- 系统性能监控
- 安全事件日志

---

## 十一、后续优化方向

1. **实时通信**: 引入WebSocket实现交易消息实时推送
2. **移动应用**: 开发React Native移动App
3. **AI推荐**: 基于用户收藏和交易历史推荐卡牌
4. **区块链集成**: NFT卡牌认证和交易
5. **国际化**: 多语言支持(英文/日文/中文)
6. **社交功能增强**: 动态feed流、评论系统、直播功能

---

**文档版本**: 1.1  
**最后更新**: 2026-04-30  
**作者**: Lingma AI Assistant
