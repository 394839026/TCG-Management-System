const http = require('http');

const API_URL = 'http://localhost:3000';

let token;
let userId;
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

async function testInventory() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  库存模块功能测试');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 注册用户
    console.log('1. 注册测试用户...');
    const timestamp = Date.now();
    const registerRes = await makeRequest('/api/auth/register', 'POST', {
      username: `invuser${timestamp}`,
      email: `inv${timestamp}@test.com`,
      password: 'password123'
    });

    if (registerRes.status === 201) {
      console.log('✓ 注册成功');
      token = registerRes.data.data.token;
      userId = registerRes.data.data._id;
      console.log(`   用户ID: ${userId}\n`);
    } else {
      console.log('✗ 注册失败:', registerRes.data.message, '\n');
      return;
    }

    // 2. 添加物品
    console.log('2. 添加物品到库存...');
    const addItemRes = await makeRequest('/api/inventory', 'POST', {
      itemName: '青眼白龙',
      itemType: 'card',
      quantity: 3,
      condition: 'near_mint',
      value: 150.00,
      description: '经典稀有卡'
    }, token);

    if (addItemRes.status === 201) {
      console.log('✓ 添加成功');
      itemId = addItemRes.data.data.id;
      console.log(`   物品ID: ${itemId}`);
      console.log(`   名称: ${addItemRes.data.data.itemName}\n`);
    } else {
      console.log('✗ 添加失败:', addItemRes.data.message, '\n');
      return;
    }

    // 3. 查看库存列表
    console.log('3. 查看库存列表...');
    const listRes = await makeRequest('/api/inventory', 'GET', null, token);

    if (listRes.status === 200) {
      console.log('✓ 获取成功');
      console.log(`   物品数量: ${listRes.data.count}\n`);
    } else {
      console.log('✗ 获取失败\n');
    }

    // 4. 查看统计
    console.log('4. 查看库存统计...');
    const statsRes = await makeRequest('/api/inventory/stats', 'GET', null, token);

    if (statsRes.status === 200) {
      console.log('✓ 统计获取成功');
      console.log(`   总物品数: ${statsRes.data.data.totalItems}`);
      console.log(`   总价值: ¥${statsRes.data.data.totalValue.toFixed(2)}\n`);
    } else {
      console.log('✗ 统计获取失败\n');
    }

    // 5. 更新物品
    console.log('5. 更新物品信息...');
    const updateRes = await makeRequest(`/api/inventory/${itemId}`, 'PUT', {
      quantity: 5,
      value: 200.00
    }, token);

    if (updateRes.status === 200) {
      console.log('✓ 更新成功');
      console.log(`   新数量: ${updateRes.data.data.quantity}`);
      console.log(`   新单价: ¥${updateRes.data.data.value}\n`);
    } else {
      console.log('✗ 更新失败\n');
    }

    // 6. 查看单个物品
    console.log('6. 查看物品详情...');
    const itemRes = await makeRequest(`/api/inventory/${itemId}`, 'GET', null, token);

    if (itemRes.status === 200) {
      console.log('✓ 获取成功');
      console.log(`   名称: ${itemRes.data.data.itemName}`);
      console.log(`   类型: ${itemRes.data.data.itemType}\n`);
    } else {
      console.log('✗ 获取失败\n');
    }

    // 7. 删除物品
    console.log('7. 删除物品...');
    const deleteRes = await makeRequest(`/api/inventory/${itemId}`, 'DELETE', null, token);

    if (deleteRes.status === 200) {
      console.log('✓ 删除成功\n');
    } else {
      console.log('✗ 删除失败\n');
    }

    // 8. 验证删除
    console.log('8. 验证删除后库存...');
    const finalListRes = await makeRequest('/api/inventory', 'GET', null, token);

    if (finalListRes.status === 200) {
      console.log('✓ 验证成功');
      console.log(`   剩余物品数: ${finalListRes.data.count}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ 所有测试完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('✗ 测试错误:', error.message);
  }
}

testInventory();
