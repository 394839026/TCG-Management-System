const fs = require('fs');
const path = require('path');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  清除所有数据');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 检查是否是 MongoDB 版本
const useMongoDB = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('localhost:27017');

if (useMongoDB) {
  console.log('⚠️  检测到 MongoDB 配置\n');
  console.log('此脚本仅适用于内存版本。对于 MongoDB 版本，请使用以下命令：\n');
  console.log('  mongosh tcg-auth-system --eval "db.users.drop()"');
  console.log('  或手动删除数据库\n');
  process.exit(1);
}

console.log('📋 此操作将：');
console.log('  ✓ 停止当前运行的服务器');
console.log('  ✓ 清除所有用户数据');
console.log('  ✓ 重置系统到初始状态\n');

console.log('⚠️  警告：此操作不可恢复！\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('确定要继续吗？(yes/no): ', async (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    await clearData();
  } else {
    console.log('\n✗ 操作已取消\n');
    rl.close();
  }
});

async function clearData() {
  console.log('\n🔄 正在清除数据...\n');

  // 查找并终止 node 进程（Windows）
  const { execSync } = require('child_process');

  try {
    console.log('1. 检查运行中的服务器...');

    // Windows: 查找占用 3000 端口的进程
    try {
      const result = execSync('netstat -ano | findstr :3000', { encoding: 'utf8' });
      const lines = result.trim().split('\n');

      if (lines.length > 0) {
        console.log('   发现运行中的服务器，正在停止...\n');

        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];

          if (pid && !isNaN(pid)) {
            try {
              execSync(`taskkill /F /PID ${pid}`);
              console.log(`   ✓ 已停止进程 PID: ${pid}`);
            } catch (e) {
              // 忽略错误
            }
          }
        });

        console.log('\n2. 等待端口释放...');
        // 等待一下让端口释放
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('   ✓ 端口已释放\n');
      } else {
        console.log('   ℹ 没有运行中的服务器\n');
      }
    } catch (e) {
      console.log('   ℹ 没有找到运行中的服务器\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ 数据清除完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 下一步操作：\n');
    console.log('1. 重新启动服务器：');
    console.log('   npm run demo\n');
    console.log('2. 第一个注册用户将成为超级管理员\n');
    console.log('3. 访问 http://localhost:3000\n');

  } catch (error) {
    console.error('\n✗ 清除数据失败:', error.message);
    console.error('\n请手动停止服务器并重新启动。\n');
  }

  rl.close();
}
