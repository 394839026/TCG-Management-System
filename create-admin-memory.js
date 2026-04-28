const fs = require('fs');
const path = require('path');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  创建默认超级管理员（内存版本）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 由于是内存版本，我们创建一个说明文件
const adminInfo = {
  username: 'admin',
  email: 'admin@tcg.com',
  password: 'admin123456',
  role: 'superadmin',
  note: '请在启动服务器后，通过注册此账号并手动设置角色为 superadmin'
};

console.log('📋 默认超级管理员信息：');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`用户名: ${adminInfo.username}`);
console.log(`邮箱:   ${adminInfo.email}`);
console.log(`密码:   ${adminInfo.password}`);
console.log(`角色:   ${adminInfo.role}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('⚠️  重要提示：');
console.log('由于使用的是内存存储版本，请按以下步骤操作：\n');
console.log('1. 启动服务器: npm run demo');
console.log('2. 使用上述信息注册账号');
console.log('3. 系统会自动将第一个注册的用户设置为超级管理员\n');

console.log('💡 或者，你可以使用 MongoDB 版本：');
console.log('1. 安装并启动 MongoDB');
console.log('2. 配置 .env 文件中的 MONGODB_URI');
console.log('3. 运行: npm run create-admin\n');

// 创建一个快速启动指南
const quickStartGuide = `
# 快速创建超级管理员

## 方法一：使用内存版本（当前）

1. 启动服务器
   \`\`\`bash
   npm run demo
   \`\`\`

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
   \`\`\`
   MONGODB_URI=mongodb://localhost:27017/tcg-auth-system
   \`\`\`

4. 运行创建脚本：
   \`\`\`bash
   npm run create-admin
   \`\`\`

5. 启动服务器：
   \`\`\`bash
   npm start
   # 或
   npm run dev
   \`\`\`


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
`;

fs.writeFileSync(path.join(__dirname, 'ADMIN_SETUP_GUIDE.md'), quickStartGuide);
console.log('\n✓ 已创建详细设置指南: ADMIN_SETUP_GUIDE.md\n');

// 检查 server-memory.js 是否需要更新以支持自动设置第一个用户为超级管理员
console.log('💡 提示：你也可以直接运行 "npm run demo" 然后使用上述凭据注册，');
console.log('   系统会将第一个注册用户自动设置为超级管理员。\n');
