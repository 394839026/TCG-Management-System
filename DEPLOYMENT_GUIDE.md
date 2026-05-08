# TCG 卡牌综合管理系统 - 服务器部署操作手册

---

## 📋 目录

1. [前置准备](#1-前置准备)
2. [部署步骤](#2-部署步骤)
3. [进阶配置](#3-进阶配置)
4. [部署检查清单](#4-部署检查清单)
5. [常见问题](#5-常见问题)
6. [启动验证](#6-启动验证)

---

## 1. 前置准备

### 1.1 服务器环境要求

| 项目 | 要求 | 推荐版本 |
|------|------|----------|
| Node.js | v14 或更高 | v18+ |
| MongoDB | 本地或云端 | 4.4+ |
| 包管理器 | npm 或 yarn | npm 9+ |

### 1.2 推荐服务器配置（生产环境）

| 资源类型 | 最低配置 | 推荐配置 |
|----------|----------|----------|
| CPU | 1核 | 2核及以上 |
| 内存 | 1GB | 2GB及以上 |
| 存储 | 10GB | 20GB及以上 |
| 操作系统 | Ubuntu 18.04+ | Ubuntu 20.04+ / CentOS 7+ |

### 1.3 必要端口开放

| 端口 | 用途 | 说明 |
|------|------|------|
| 80 | HTTP 访问 | Nginx 反向代理 |
| 443 | HTTPS 访问 | SSL 加密连接 |
| 8000 | 后端服务 | Node.js 应用端口 |
| 27017 | MongoDB | 数据库端口（可选，仅本地连接） |

---

## 2. 部署步骤

### 步骤 2.1：克隆项目到服务器

```bash
# 创建项目目录
mkdir -p /var/www
cd /var/www

# 克隆仓库（请替换为实际仓库地址）
git clone <项目仓库地址>
cd TCG-Card-Comprehensive-Management-System
```

### 步骤 2.2：安装后端依赖

```bash
# 安装生产依赖（不含开发依赖）
npm install --production
```

**预期输出**：
```
added 150 packages in 10s
```

### 步骤 2.3：安装前端依赖并构建

```bash
# 进入前端目录
cd frontend

# 安装前端依赖
npm install

# 构建生产版本
npm run build

# 返回项目根目录
cd ..
```

**验证构建结果**：
```bash
ls -la frontend/dist/
```

**预期输出**：
```
total 128
drwxr-xr-x  3 root root  4096 May  8 10:00 .
drwxr-xr-x  2 root root  4096 May  8 10:00 assets
-rw-r--r--  1 root root 65536 May  8 10:00 index.html
```

### 步骤 2.4：配置环境变量（关键步骤）

**编辑后端环境配置文件：**

```bash
nano .env
```

**配置内容（生产环境）：**

```env
# 服务器端口配置
PORT=8000

# MongoDB 连接字符串
# 本地数据库：MONGODB_URI=mongodb://localhost:27017/tcg_card_system
# 云端数据库（MongoDB Atlas）：
MONGODB_URI=mongodb+srv://<用户名>:<密码>@cluster0.mongodb.net/tcg_card_system

# JWT 密钥（必须更换为安全的随机字符串！）
JWT_SECRET=your-very-secure-random-jwt-secret-key-at-least-32-characters-long

# JWT 过期时间
JWT_EXPIRE=7d
```

**配置说明：**

| 配置项 | 说明 | 安全要求 |
|--------|------|----------|
| PORT | 后端服务端口 | 默认 8000 |
| MONGODB_URI | 数据库连接地址 | 生产环境禁止使用 localhost |
| JWT_SECRET | JWT 签名密钥 | 至少32位随机字符，切勿泄露 |
| JWT_EXPIRE | Token 有效期 | 建议 7d（7天） |

**编辑前端环境配置文件：**

```bash
nano frontend/.env
```

**配置内容：**

```env
# 生产环境请使用服务器公网 IP 或域名
VITE_API_URL=http://your-server-ip:8000/api
# 或使用域名
# VITE_API_URL=https://your-domain.com/api
```

### 步骤 2.5：启动服务

#### 方式一：直接启动（仅用于测试，不推荐生产环境）

```bash
npm start
```

#### 方式二：使用 PM2 进程管理（推荐生产环境）

```bash
# 安装 PM2（如果未安装）
npm install -g pm2

# 启动应用并设置名称
pm2 start server.js --name tcg-system

# 设置开机自启
pm2 startup

# 保存当前进程配置
pm2 save
```

**PM2 常用管理命令：**

| 命令 | 说明 |
|------|------|
| `pm2 status` | 查看所有进程状态 |
| `pm2 logs tcg-system` | 查看应用日志 |
| `pm2 restart tcg-system` | 重启应用 |
| `pm2 stop tcg-system` | 停止应用 |
| `pm2 reload tcg-system` | 零停机重启 |

**验证服务启动：**

```bash
pm2 status
```

**预期输出示例：**
```
┌─────┬─────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name            │ namespace   │ version │ mode    │ pid      │ uptime │
├─────┼─────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ tcg-system      │ default     │ 1.0.0   │ fork    │ 12345    │ 5m     │
└─────┴─────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┘
```

---

## 3. 进阶配置（生产环境推荐）

### 3.1 配置 Nginx 反向代理

**步骤 1：安装 Nginx**

```bash
sudo apt update && sudo apt install nginx -y
```

**步骤 2：创建 Nginx 配置文件**

```bash
sudo nano /etc/nginx/sites-available/tcg-system
```

**配置内容：**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或服务器 IP

    # 前端静态文件服务
    location / {
        root /var/www/TCG-Card-Comprehensive-Management-System/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 请求代理到后端
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 错误页面配置
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

**步骤 3：启用配置**

```bash
# 创建软链接到 sites-enabled
sudo ln -s /etc/nginx/sites-available/tcg-system /etc/nginx/sites-enabled/

# 检查配置语法
sudo nginx -t

# 重启 Nginx 服务
sudo systemctl restart nginx
```

### 3.2 配置 SSL 证书（HTTPS）

**使用 Let's Encrypt 获取免费证书：**

```bash
# 安装 Certbot 和 Nginx 插件
sudo apt install certbot python3-certbot-nginx -y

# 自动获取并配置证书
sudo certbot --nginx -d your-domain.com
```

**证书自动续期配置：**

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 添加定时任务（通常已自动配置）
crontab -l | grep certbot
```

### 3.3 配置防火墙

```bash
# 允许 HTTP 和 HTTPS 访问
sudo ufw allow 'Nginx Full'

# 允许 SSH 访问
sudo ufw allow ssh

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

---

## 4. 部署检查清单

在正式上线前，请确认以下项目已完成：

| 检查项 | 状态 | 备注 |
|--------|------|------|
| ✅ Node.js 版本 >= 14 | | 使用 `node -v` 检查 |
| ✅ MongoDB 连接正常 | | 云端或本地服务运行中 |
| ✅ `.env` 配置正确 | | JWT_SECRET 已更换 |
| ✅ 前端构建完成 | | `frontend/dist` 目录存在 |
| ✅ PM2 进程运行中 | | `pm2 status` 显示正常 |
| ✅ Nginx 配置完成 | | 可选但推荐 |
| ✅ SSL 证书配置 | | 可选但推荐 |
| ✅ 防火墙规则配置 | | 开放必要端口 |
| ✅ 测试用户注册登录 | | 验证功能正常 |

---

## 5. 常见问题

### 问题 1：端口被占用

**现象**：启动服务时提示 "EADDRINUSE: address already in use"

**解决方法**：

```bash
# 查找占用 8000 端口的进程
lsof -i :8000

# 杀死进程（替换 <PID> 为实际进程号）
kill -9 <PID>
```

### 问题 2：MongoDB 连接失败

**现象**：应用启动时无法连接数据库

**排查步骤**：

1. 检查 MongoDB 服务状态
```bash
# 本地 MongoDB
sudo systemctl status mongod

# 云端 MongoDB：检查 Atlas 控制台网络白名单配置
```

2. 验证连接字符串格式
```bash
# 使用 mongo shell 测试连接
mongosh "mongodb+srv://<username>:<password>@cluster0.mongodb.net/"
```

3. 检查防火墙规则
```bash
# 确保服务器可以访问 MongoDB 端口
telnet cluster0.mongodb.net 27017
```

### 问题 3：前端无法访问 API

**现象**：前端页面显示正常，但 API 请求失败

**排查步骤**：

1. 检查后端服务是否运行
```bash
pm2 status
```

2. 检查前端环境配置
```bash
cat frontend/.env
```

3. 检查端口开放情况
```bash
curl http://localhost:8000/api/auth/register
```

4. 检查 Nginx 配置（如果使用）
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### 问题 4：PM2 开机自启失败

**现象**：服务器重启后应用未自动启动

**解决方法**：

```bash
# 重新配置开机自启
pm2 unstartup
pm2 startup
pm2 save
```

### 问题 5：前端静态资源加载失败

**现象**：页面显示空白或样式丢失

**排查步骤**：

1. 确认前端已构建
```bash
ls -la frontend/dist/assets/
```

2. 检查 Nginx root 路径配置
```bash
cat /etc/nginx/sites-enabled/tcg-system | grep root
```

3. 检查文件权限
```bash
chown -R www-data:www-data frontend/dist/
```

---

## 6. 启动验证

### 6.1 基础验证

**访问前端首页**：
```
http://your-server-ip
或
https://your-domain.com
```

**预期结果**：显示登录/注册页面

### 6.2 API 接口验证

**测试用户注册接口**：

```bash
curl -X POST http://your-server-ip:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'
```

**成功响应示例**：
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "60d21b4667d0d8992e610c85",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**测试用户登录接口**：

```bash
curl -X POST http://your-server-ip:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**成功响应示例**：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 6.3 完整功能测试

| 测试项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| 用户注册 | 在前端页面注册新用户 | 注册成功，跳转登录 |
| 用户登录 | 使用注册账号登录 | 登录成功，进入首页 |
| 页面导航 | 点击各功能菜单 | 页面正常切换 |
| 数据操作 | 尝试创建/编辑数据 | 操作成功，数据持久化 |

---

## 📞 技术支持

如果遇到部署问题，请提供以下信息：

1. 服务器操作系统及版本
2. Node.js 版本（`node -v`）
3. npm 版本（`npm -v`）
4. 错误日志截图或内容
5. `.env` 文件内容（隐藏敏感信息）

---

**文档版本**: v1.0  
**创建日期**: 2026-05-08  
**适用版本**: TCG 卡牌综合管理系统 v1.0.0