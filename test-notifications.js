const http = require('http');

console.log('🧪 测试通知路由...\n');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/notifications',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`📊 状态码: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📄 响应:');
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error('❌ 错误:', error.message);
});

req.end();
