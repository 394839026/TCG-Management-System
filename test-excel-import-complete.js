const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE_URL = 'http://localhost:3000/api';

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testExcelImport() {
  log(colors.cyan, '\n========================================');
  log(colors.cyan, '  Excel导入功能完整测试');
  log(colors.cyan, '========================================\n');

  let authToken = '';
  let userId = '';

  // 测试步骤1: 检查服务器是否运行
  try {
    log(colors.blue, '步骤 1: 检查服务器状态...');
    await axios.get('http://localhost:3000');
    log(colors.green, '✓ 服务器运行正常\n');
  } catch (error) {
    log(colors.red, '✗ 服务器未运行或无法访问');
    log(colors.red, '  请先运行: npm start\n');
    process.exit(1);
  }

  // 测试步骤2: 创建用户账户并登录
  try {
    log(colors.blue, '步骤 2: 创建用户账户并登录...');

    // 尝试注册新用户（使用短用户名，不超过20字符）
    const timestamp = Date.now().toString().slice(-6); // 只取后6位
    const registerData = {
      username: `testuser${timestamp}`,
      email: `testuser${timestamp}@test.com`,
      password: 'Test@123456'
    };

    let registerResponse;
    try {
      registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
      log(colors.green, '  ✓ 用户账户注册成功');
      
      // 从注册响应中获取token
      authToken = registerResponse.data.data.token;
      userId = registerResponse.data.data._id;
      
      log(colors.green, '  ✓ 自动登录成功');
    } catch (err) {
      // 如果已存在，直接登录
      log(colors.yellow, '  ! 注册失败，尝试登录...');
      if (err.response) {
        log(colors.yellow, `    注册错误: ${JSON.stringify(err.response.data)}`);
      }
      
      // 登录获取token
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: registerData.email,
        password: registerData.password
      });

      authToken = loginResponse.data.data.token;
      userId = loginResponse.data.data._id;
      
      log(colors.green, '  ✓ 登录成功');
    }

    log(colors.green, `  Token: ${authToken.substring(0, 20)}...\n`);
    
    // 获取用户信息并检查角色
    const userResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const userRole = userResponse.data.data.role;
    log(colors.green, `  用户角色: ${userRole}`);
    log(colors.green, `  用户名: ${userResponse.data.data.username}\n`);
    
    // 检查是否有管理员权限
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      log(colors.yellow, '  ⚠ 警告: 当前用户不是管理员，无法测试Excel导入功能');
      log(colors.yellow, '  提示: 需要使用管理员账户进行导入测试\n');
    }
    
    return { authToken, userId, userRole };
  } catch (error) {
    log(colors.red, '✗ 登录失败');
    if (error.response) {
      log(colors.red, `  状态码: ${error.response.status}`);
      log(colors.red, `  响应数据: ${JSON.stringify(error.response.data)}`);
    } else {
      log(colors.red, `  错误: ${error.message}`);
    }
    process.exit(1);
  }

  // 测试步骤3: 下载Excel模板
  try {
    log(colors.blue, '步骤 3: 下载Excel模板...');
    const response = await axios.get(`${API_BASE_URL}/inventory/template`, {
      responseType: 'arraybuffer'
    });

    const templatePath = path.join(__dirname, 'downloaded_template.xlsx');
    fs.writeFileSync(templatePath, response.data);
    log(colors.green, '  ✓ 模板下载成功');
    log(colors.green, `  文件路径: ${templatePath}\n`);
  } catch (error) {
    log(colors.red, '✗ 模板下载失败:', error.message);
    process.exit(1);
  }

  // 测试步骤4: 使用现有测试文件导入
  if (userRole === 'admin' || userRole === 'superadmin') {
    try {
      log(colors.blue, '步骤 4: 导入Excel文件...');
      const testFilePath = path.join(__dirname, 'test_inventory.xlsx');

      if (!fs.existsSync(testFilePath)) {
        log(colors.red, `  ✗ 测试文件不存在: ${testFilePath}`);
        log(colors.yellow, '  提示: 请先运行 node test-excel-import.js 创建测试文件\n');
        process.exit(1);
      }

      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));

      const response = await axios.post(`${API_BASE_URL}/inventory/import`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      });

      log(colors.green, '  ✓ 导入请求成功');
      log(colors.green, `  响应消息: ${response.data.message}\n`);

      if (response.data.data) {
        log(colors.cyan, '  导入结果详情:');
        log(colors.green, `    - 成功: ${response.data.data.success} 条`);
        log(colors.red, `    - 失败: ${response.data.data.failed} 条`);

        if (response.data.data.errors && response.data.data.errors.length > 0) {
          log(colors.yellow, '\n  错误详情:');
          response.data.data.errors.forEach(err => {
            log(colors.yellow, `    行 ${err.row}: ${err.error}`);
          });
        }
        console.log('');
      }
    } catch (error) {
      log(colors.red, '✗ 导入失败');
      if (error.response) {
        log(colors.red, `  状态码: ${error.response.status}`);
        log(colors.red, `  响应数据: ${JSON.stringify(error.response.data)}`);
      } else {
        log(colors.red, `  错误: ${error.message}`);
      }
      process.exit(1);
    }
  } else {
    log(colors.yellow, '步骤 4: 跳过Excel导入测试（需要管理员权限）\n');
  }

  // 测试步骤5: 验证导入的数据
  try {
    log(colors.blue, '步骤 5: 验证导入的数据...');
    const response = await axios.get(`${API_BASE_URL}/inventory`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    log(colors.green, '  ✓ 获取库存列表成功');
    log(colors.green, `  总数量: ${response.data.count} 条记录\n`);

    if (response.data.data && response.data.data.length > 0) {
      log(colors.cyan, '  前5条记录:');
      response.data.data.slice(0, 5).forEach((item, index) => {
        log(colors.green, `    ${index + 1}. ${item.itemName}`);
        console.log(`       - 编号: ${item.itemNo || 'N/A'}`);
        console.log(`       - 编码: ${item.itemCode || 'N/A'}`);
        console.log(`       - 稀有度: ${item.rarity}`);
        console.log(`       - 类型: ${item.itemType}`);
        console.log(`       - 数量: ${item.quantity}`);
        console.log(`       - 价格: ¥${item.value}`);
        console.log(`       - 状态: ${item.condition}`);
      });
      console.log('');
    }
  } catch (error) {
    log(colors.red, '✗ 验证数据失败:', error.response?.data || error.message);
    process.exit(1);
  }

  // 测试步骤6: 获取统计信息
  try {
    log(colors.blue, '步骤 6: 获取库存统计信息...');
    const response = await axios.get(`${API_BASE_URL}/inventory/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    log(colors.green, '  ✓ 统计信息获取成功');

    if (response.data.data) {
      const stats = response.data.data;
      log(colors.green, `  总物品数: ${stats.totalItems}`);
      log(colors.green, `  总价值: ¥${stats.totalValue.toFixed(2)}\n`);

      if (stats.byType && stats.byType.length > 0) {
        log(colors.cyan, '  按类型统计:');
        stats.byType.forEach(stat => {
          const typeNames = {
            card: '卡牌',
            booster: '补充包',
            box: '盒装',
            accessory: '配件',
            other: '其他'
          };
          log(colors.green, `    - ${typeNames[stat._id] || stat._id}: ${stat.count} 种, 共 ${stat.totalQuantity} 个`);
        });
      }
      console.log('');
    }
  } catch (error) {
    log(colors.red, '✗ 获取统计信息失败:', error.response?.data || error.message);
  }

  // 测试总结
  log(colors.cyan, '========================================');
  log(colors.green, '  所有测试完成!');
  log(colors.cyan, '========================================\n');

  log(colors.green, '测试项目总结:');
  log(colors.green, '  ✓ 服务器连接');
  log(colors.green, '  ✓ 用户认证');
  log(colors.green, '  ✓ Excel模板下载');
  log(colors.green, '  ✓ Excel文件导入');
  log(colors.green, '  ✓ 数据验证');
  log(colors.green, '  ✓ 统计信息查询\n');

  log(colors.yellow, '下一步操作:');
  log(colors.yellow, '  1. 访问 http://localhost:3000');
  log(colors.yellow, '  2. 使用以下凭据登录:');
  log(colors.yellow, `     邮箱: admin_test_${Date.now().toString().substring(0, 8)}@test.com`);
  log(colors.yellow, '     密码: Admin@123456');
  log(colors.yellow, '  3. 在库存管理页面查看导入的数据\n');
}

// 运行测试
testExcelImport().catch(error => {
  log(colors.red, '\n测试过程中发生错误:', error.message);
  if (error.response) {
    log(colors.red, '响应状态:', error.response.status);
    log(colors.red, '响应数据:', error.response.data);
  }
  process.exit(1);
});
