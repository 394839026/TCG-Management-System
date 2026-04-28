const http = require('http');

console.log('\n=== TCG系统诊断工具 ===\n');

// 测试服务器连接
console.log('1. 检查服务器状态...');
http.get('http://localhost:3000', (res) => {
  console.log(`   ✓ 服务器响应: ${res.statusCode}`);

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data.includes('registerForm')) {
      console.log('   ✓ HTML页面正常加载\n');
    } else {
      console.log('   ✗ HTML页面可能有问题\n');
    }

    testAPI();
  });
}).on('error', (err) => {
  console.log(`   ✗ 服务器连接失败: ${err.message}`);
  console.log('   提示: 请确保运行了 node server-memory.js\n');
});

// 测试注册API
function testAPI() {
  console.log('2. 测试注册API...');

  const postData = JSON.stringify({
    username: 'diag_user',
    email: 'diag@test.com',
    password: 'Diag@123456'
  });

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
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('   ✓ 注册API正常工作\n');
          console.log('   用户信息:', {
            id: response.data._id,
            username: response.data.username,
            role: response.data.role
          });
          console.log('\n=== 诊断完成 ===');
          console.log('服务器和API都正常工作！');
          console.log('如果浏览器仍无法使用，请：');
          console.log('1. 清除浏览器缓存 (Ctrl+Shift+Delete)');
          console.log('2. 强制刷新页面 (Ctrl+F5)');
          console.log('3. 或使用无痕模式访问 http://localhost:3000\n');
        } else {
          console.log(`   ✗ 注册失败: ${response.message}\n`);
        }
      } catch (e) {
        console.log(`   响应: ${data}\n`);
      }
    });
  });

  req.on('error', (err) => {
    console.log(`   ✗ API请求失败: ${err.message}\n`);
  });

  req.write(postData);
  req.end();
}
