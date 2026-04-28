# TCG 卡牌综合管理系统 - 用户认证模块

一个基于 Node.js + Express + MongoDB 的现代化用户注册和登录系统。

## 功能特性

- 用户注册（含密码加密）
- 用户登录（JWT 令牌认证）
- 受保护的路由示例
- 现代化响应式前端界面
- 输入验证和错误处理
- RESTful API 设计

## 技术栈

- **后端**: Node.js, Express.js
- **数据库**: MongoDB, Mongoose
- **认证**: JWT (JSON Web Tokens)
- **密码加密**: bcryptjs
- **验证**: express-validator
- **前端**: HTML5, CSS3, JavaScript

## 安装和运行

### 前置要求

- Node.js (v14 或更高版本)
- MongoDB (本地或云端)

### 安装步骤

1. 安装依赖
```bash
npm install
```

2. 配置环境变量
编辑 `.env` 文件，设置正确的 MongoDB 连接字符串：
```
MONGODB_URI=mongodb://localhost:27017/tcg-auth-system
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

3. 启动 MongoDB
确保 MongoDB 服务正在运行

4. 启动服务器

开发模式（自动重启）:
```bash
npm run dev
```

生产模式:
```bash
npm start
```

服务器将在 http://localhost:3000 运行

## API 端点

### 用户注册
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

### 用户登录
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 获取当前用户信息（需要认证）
```
GET /api/auth/me
Authorization: Bearer <token>
```

### 访问仪表板（需要认证）
```
GET /api/dashboard
Authorization: Bearer <token>
```

## 测试

运行自动化测试：
```bash
node test-api.js
```

## 项目结构

```
├── config/
│   └── db.js              # 数据库配置
├── models/
│   └── User.js            # 用户模型
├── routes/
│   ├── auth.js            # 认证路由
│   └── dashboard.js       # 仪表板路由
├── middleware/
│   └── auth.js            # JWT 认证中间件
├── public/
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── js/
│   │   └── app.js         # 前端 JavaScript
│   └── index.html         # 主页面
├── .env                   # 环境变量
├── .gitignore
├── server.js              # 服务器入口
├── package.json
└── test-api.js            # API 测试脚本
```

## 安全特性

- 密码使用 bcrypt 加密存储
- JWT 令牌认证
- 输入验证和清理
- CORS 支持
- SQL 注入防护（通过 Mongoose）

## 许可证

ISC
