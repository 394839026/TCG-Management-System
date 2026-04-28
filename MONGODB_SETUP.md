# MongoDB 设置指南

## 选项 1: 使用 MongoDB Atlas（推荐 - 免费云端）

1. 访问 https://www.mongodb.com/cloud/atlas/register
2. 创建免费账户
3. 创建一个新的集群（选择免费层 M0）
4. 创建数据库用户（用户名和密码）
5. 在 "Network Access" 中添加你的 IP 地址（或允许所有 IP：0.0.0.0/0）
6. 点击 "Connect" -> "Connect your application"
7. 复制连接字符串，格式如下：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/tcg-auth-system?retryWrites=true&w=majority
   ```
8. 将 `<username>` 和 `<password>` 替换为你的实际凭据
9. 将连接字符串粘贴到 `.env` 文件的 `MONGODB_URI` 中

## 选项 2: 本地安装 MongoDB

### Windows:
1. 下载 MongoDB Community Server: https://www.mongodb.com/try/download/community
2. 运行安装程序
3. MongoDB 将作为服务自动启动

### macOS (使用 Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu):
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 验证 MongoDB 运行状态

```bash
mongosh
```

如果成功连接，说明 MongoDB 正在运行。
