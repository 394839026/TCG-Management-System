const axios = require('axios');

const API_URL = 'http://localhost:3000/api/auth';

async function simpleTest() {
  console.log('=== 简单权限测试 ===\n');

  try {
    // 1. 注册用户
    console.log('1. 注册普通用户...');
    const timestamp = Date.now();
    const userRes = await axios.post(`${API_URL}/register`, {
      username: 'newuser' + timestamp,
      email: 'test' + timestamp + '@test.com',
      password: 'password123'
    });
    console.log('✓ 注册成功, 角色:', userRes.data.data.role);
    const userToken = userRes.data.data.token;

    // 2. 尝试访问管理员功能（应该失败）
    console.log('\n2. 普通用户尝试访问用户列表...');
    try {
      await axios.get(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      console.log('✗ 失败：不应该能访问');
    } catch (error) {
      console.log('✓ 正确拒绝访问, 状态码:', error.response.status);
    }

    // 3. 登录测试
    console.log('\n3. 用户登录...');
    const loginRes = await axios.post(`${API_URL}/login`, {
      email: 'test' + timestamp + '@test.com',
      password: 'password123'
    });
    console.log('✓ 登录成功, 角色:', loginRes.data.data.role);

    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

simpleTest();
