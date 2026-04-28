const { spawn } = require('child_process');
const http = require('http');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  TCG 用户认证系统 - 快速启动');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 检查服务器是否已在运行
function checkServer() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function start() {
  console.log('🔍 检查服务器状态...\n');

  const isRunning = await checkServer();

  if (isRunning) {
    console.log('⚠️  服务器已在运行中！\n');
    console.log('访问地址: http://localhost:3000\n');
    console.log('如需重启，请先停止当前服务器 (Ctrl+C)\n');
    return;
  }

  console.log('✓ 服务器未运行，正在启动...\n');

  // 启动服务器
  const server = spawn('node', ['server-memory.js'], {
    stdio: 'inherit',
    shell: true
  });

  server.on('error', (err) => {
    console.error('✗ 启动失败:', err.message);
  });

  server.on('exit', (code) => {
    if (code !== 0) {
      console.log(`\n✗ 服务器退出，代码: ${code}`);
    }
  });

  // 等待服务器启动
  setTimeout(() => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ 服务器启动成功！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📍 访问地址: http://localhost:3000\n');
    console.log('💡 提示:');
    console.log('  - 第一个注册的用戶会自动成为超级管理员');
    console.log('  - 按 Ctrl+C 停止服务器\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }, 2000);
}

start();
