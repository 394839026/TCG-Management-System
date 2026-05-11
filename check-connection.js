
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

console.log('\n=== TCG系统连接诊断 ===\n');

async function runDiagnostics() {
  // 1. 检查 MongoDB 连接
  console.log('1. 检查 MongoDB 连接...');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`   ✓ MongoDB 连接成功: ${process.env.MONGODB_URI}`);
    await mongoose.connection.close();
  } catch (err) {
    console.log(`   ✗ MongoDB 连接失败: ${err.message}`);
    console.log('   提示: 请确保 MongoDB 服务正在运行\n');
  }

  // 2. 检查后端服务器 (端口 8000)
  console.log('\n2. 检查后端服务器...');
  testServer(8000, '后端服务器')
    .then(() => testAPI())
    .catch(() => {
      console.log('\n3. 检查前端开发服务器...');
      testServer(5173, '前端开发服务器')
        .then(() => console.log('\n=== 诊断完成 ==='))
        .catch(() => console.log('\n=== 诊断完成 ==='));
    });
}

function testServer(port, name) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}`, (res) => {
      console.log(`   ✓ ${name}运行在端口 ${port}，状态码: ${res.statusCode}`);
      resolve();
    }).on('error', (err) => {
      console.log(`   ✗ ${name}连接失败: ${err.message}`);
      console.log(`   提示: 请运行 "npm start" 启动${name}`);
      reject();
    });
  });
}

function testAPI() {
  console.log('\n3. 测试 API 接口...');
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.success || response.message) {
          console.log('   ✓ API 正常响应');
        } else {
          console.log('   ⚠ API 响应异常，但服务器在运行');
        }
      } catch (e) {
        console.log('   ✓ API 正常响应');
      }
      
      // 检查前端服务器
      console.log('\n4. 检查前端开发服务器...');
      testServer(5173, '前端开发服务器').finally(() => {
        console.log('\n=== 诊断完成 ===');
        console.log('\n启动服务步骤:');
        console.log('1. 确保 MongoDB 正在运行');
        console.log('2. 在项目根目录运行: npm start (启动后端)');
        console.log('3. 在 frontend 目录运行: npm run dev (启动前端)\n');
      });
    });
  });

  req.on('error', () => {
    console.log('   ⚠ 无法测试注册 API，但服务器可能在运行');
    console.log('\n4. 检查前端开发服务器...');
    testServer(5173, '前端开发服务器').finally(() => {
      console.log('\n=== 诊断完成 ===\n');
    });
  });

  req.write(JSON.stringify({}));
  req.end();
}

runDiagnostics();

