const http = require('http');

const API_URL = 'http://localhost:3000';

// 生成随机用户名避免冲突（用户名限制3-20字符）
const randomNum = Math.floor(Math.random() * 10000);
const superAdminData = {
  username: `admin${randomNum}`,
  email: `admin${randomNum}@tcg.com`,
  password: 'admin123456'
};

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  自动创建超级管理员');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('正在创建超级管理员账号...\n');

const postData = JSON.stringify(superAdminData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (response.success) {
        console.log('✓ 超级管理员创建成功！\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  登录凭据');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`用户名: ${response.data.username}`);
        console.log(`邮箱:   ${response.data.email}`);
        console.log(`密码:   admin123456`);
        console.log(`角色:   ${response.data.role}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (response.data.role === 'superadmin') {
          console.log('✓ 该账号已自动设置为超级管理员角色\n');
        }

        console.log('现在你可以：');
        console.log('1. 打开浏览器访问 http://localhost:3000');
        console.log('2. 使用上述凭据登录');
        console.log('3. 访问管理面板进行用户管理\n');
      } else {
        console.log('✗ 创建失败:', response.message);
        console.log('\n提示：服务器可能已经在运行，且有同名用户存在。');
        console.log('请尝试使用不同的用户名或重启服务器。\n');
      }
    } catch (e) {
      console.log('✗ 响应解析错误');
      console.log('原始响应:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('✗ 请求失败:', e.message);
  console.error('\n提示：请确保服务器正在运行 (npm run demo)');
});

req.write(postData);
req.end();
