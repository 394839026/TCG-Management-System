const http = require('http');

const API_URL = 'http://localhost:3000';

let userToken;
let adminToken;
let itemId;

function makeRequest(path, method, data, authToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function testPermissions() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  库存权限测试 - 普通用户限制');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 注册普通用户
    console.log('1. 注册普通用户...');
    const timestamp = Date.now();
    const userRes = await makeRequest('/api/auth/register', 'POST', {
      username: `user${timestamp}`,
      email: `user${timestamp}@test.com`,
      password: 'password123'
    });

    if (userRes.status === 201) {
      console.log('✓ 注册成功');
      userToken = userRes.data.data.token;
      console.log(`   角色: ${userRes.data.data.role}\n`);
    }

    // 2. 注册管理员
    console.log('2. 注册管理员...');
    const adminRes = await makeRequest('/api/auth/register', 'POST', {
      username: `admin${timestamp}`,
      email: `admin${timestamp}@test.com`,
      password: 'password123'
    });

    if (adminRes.status === 201) {
      console.log('✓ 注册成功');
      adminToken = adminRes.data.data.token;
      console.log(`   角色: ${adminRes.data.data.role}\n`);
    }

    // 3. 普通用户尝试添加物品（应该失败）
    console.log('3. 普通用户尝试添加物品...');
    const addUserItemRes = await makeRequest('/api/inventory', 'POST', {
      itemName: '测试卡片',
      quantity: 5
    }, userToken);

    if (addUserItemRes.status === 403) {
      console.log('✓ 正确拒绝');
      console.log(`   错误信息: ${addUserItemRes.data.message}\n`);
    } else {
      console.log('✗ 测试失败：应该返回 403\n');
    }

    // 4. 管理员添加物品（应该成功）
    console.log('4. 管理员添加物品...');
    const addItemRes = await makeRequest('/api/inventory', 'POST', {
      itemName: '青眼白龙',
      itemType: 'card',
      quantity: 3,
      value: 150
    }, adminToken);

    if (addItemRes.status === 201) {
      console.log('✓ 添加成功');
      itemId = addItemRes.data.data.id;
      console.log(`   物品ID: ${itemId}\n`);
    } else {
      console.log('✗ 添加失败\n');
      return;
    }

    // 5. 普通用户尝试修改名称（应该失败）
    console.log('5. 普通用户尝试修改物品名称...');
    const updateNameRes = await makeRequest(`/api/inventory/${itemId}`, 'PUT', {
      itemName: '新名称',
      quantity: 10
    }, userToken);

    if (updateNameRes.status === 403) {
      console.log('✓ 正确拒绝');
      console.log(`   错误信息: ${updateNameRes.data.message}\n`);
    } else {
      console.log('✗ 测试失败：应该返回 403\n');
    }

    // 6. 普通用户只修改数量（应该成功）
    console.log('6. 普通用户修改数量...');
    const updateQtyRes = await makeRequest(`/api/inventory/${itemId}`, 'PUT', {
      quantity: 8
    }, userToken);

    if (updateQtyRes.status === 200) {
      console.log('✓ 修改成功');
      console.log(`   新数量: ${updateQtyRes.data.data.quantity}\n`);
    } else {
      console.log('✗ 修改失败:', updateQtyRes.data.message, '\n');
    }

    // 7. 管理员修改任意字段（应该成功）
    console.log('7. 管理员修改物品名称...');
    const adminUpdateRes = await makeRequest(`/api/inventory/${itemId}`, 'PUT', {
      itemName: '蓝眼白龙',
      quantity: 5,
      value: 200
    }, adminToken);

    if (adminUpdateRes.status === 200) {
      console.log('✓ 修改成功');
      console.log(`   新名称: ${adminUpdateRes.data.data.itemName}`);
      console.log(`   新价格: ¥${adminUpdateRes.data.data.value}\n`);
    } else {
      console.log('✗ 修改失败\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ 所有权限测试完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('✗ 测试错误:', error.message);
  }
}

testPermissions();
