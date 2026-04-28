const axios = require('axios');

const API_URL = 'http://localhost:3000/api/auth';

async function testAuth() {
  console.log('=== 开始测试认证系统 ===\n');

  // 测试数据
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  try {
    // 1. 测试注册
    console.log('1. 测试用户注册...');
    const registerResponse = await axios.post(`${API_URL}/register`, testUser);
    console.log('✓ 注册成功!');
    console.log('返回数据:', JSON.stringify(registerResponse.data, null, 2));
    const token = registerResponse.data.data.token;

    // 2. 测试登录
    console.log('\n2. 测试用户登录...');
    const loginResponse = await axios.post(`${API_URL}/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✓ 登录成功!');
    console.log('返回数据:', JSON.stringify(loginResponse.data, null, 2));

    // 3. 测试获取用户信息(受保护的路由)
    console.log('\n3. 测试获取用户信息(需要token)...');
    const meResponse = await axios.get(`${API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✓ 获取用户信息成功!');
    console.log('返回数据:', JSON.stringify(meResponse.data, null, 2));

    // 4. 测试仪表板路由
    console.log('\n4. 测试仪表板路由...');
    const dashboardResponse = await axios.get('http://localhost:3000/api/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✓ 访问仪表板成功!');
    console.log('返回数据:', JSON.stringify(dashboardResponse.data, null, 2));

    // 5. 测试无效token
    console.log('\n5. 测试无效token...');
    try {
      await axios.get(`${API_URL}/me`, {
        headers: {
          'Authorization': 'Bearer invalid_token'
        }
      });
    } catch (error) {
      console.log('✓ 正确拒绝了无效token');
      console.log('错误信息:', error.response.data.message);
    }

    console.log('\n=== 所有测试通过! ===');
  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message);
  }
}

testAuth();
