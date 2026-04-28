
# 快速创建超级管理员

## 方法一：使用内存版本（当前）

1. 启动服务器
   ```bash
   npm run demo
   ```

2. 打开浏览器访问 http://localhost:3000

3. 注册以下账号：
   - 用户名: admin
   - 邮箱: admin@tcg.com
   - 密码: admin123456

4. 系统会自动将第一个注册用户设为超级管理员


## 方法二：使用 MongoDB 版本（推荐）

1. 安装 MongoDB
   - Windows: https://www.mongodb.com/try/download/community
   - macOS: brew install mongodb-community
   - Linux: sudo apt install mongodb

2. 启动 MongoDB 服务

3. 更新 .env 文件：
   ```
   MONGODB_URI=mongodb://localhost:27017/tcg-auth-system
   ```

4. 运行创建脚本：
   ```bash
   npm run create-admin
   ```

5. 启动服务器：
   ```bash
   npm start
   # 或
   npm run dev
   ```


## 默认超级管理员凭据

┌──────────┬─────────────────────┐
│ 字段     │ 值                  │
├──────────┼─────────────────────┤
│ 用户名   │ admin               │
│ 邮箱     │ admin@tcg.com       │
│ 密码     │ admin123456         │
│ 角色     │ superadmin          │
└──────────┴─────────────────────┘

⚠️ 首次登录后请立即修改密码！
