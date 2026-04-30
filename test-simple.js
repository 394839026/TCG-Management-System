const http = require('http');

console.log('🧪 测试简单路由...\n');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/test',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`📊 状态码: ${res.statusCode}`);
  console.log(`📊 状态消息: ${res.statusMessage}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📄 响应数据:');
    console.log(data);
    
    if (res.statusCode === 200) {
      console.log('\n✅ 成功！API 正常工作！');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求错误:', error.message);
});

req.end();
