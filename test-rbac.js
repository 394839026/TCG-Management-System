const axios = require('axios');

const API_URL = 'http://localhost:3000/api/auth';

let superAdminToken;
let adminToken;
let userToken;
let adminId;
let userId;

async function testRBAC() {
  console.log('=== 开始测试角色权限系统 ===\n');

  try {
    // 1. 创建超级管理员
    console.log('1. 创建超级管理员...');
    const superAdminRes = await axios.post(`${API_URL}/register`, {
      username: 'superadmin',
      email: 'superadmin@test.com',
      password: 'password123'
    });

    // 手动设置为超级管理员（在实际应用中通过脚本创建）
    superAdminToken = superAdminRes.data.data.token;
    console.log('✓ 超级管理员注册成功');

    // 2. 普通用户注册
    console.log('\n2. 普通用户注册...');
    const userRes = await axios.post(`${API_URL}/register`, {
      username: 'normaluser',
      email: 'user@test.com',
      password: 'password123'
    });
    userToken = userRes.data.data.token;
    userId = userRes.data.data._id;
    console.log('✓ 普通用户注册成功');

    // 3. 管理员注册用户
    console.log('\n3. 测试管理员注册用户...');
    try {
      const newUserRes = await axios.post(`${API_URL}/admin/register`, {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123'
      }, {
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      });
      console.log('✓ 管理员创建用户成功');
      console.log('创建的用户:', newUserRes.data.data);
    } catch (error) {
      console.log('✗ 管理员创建用户失败:', error.response.data.message);
    }

    // 4. 普通用户尝试访问管理员功能（应该失败）
    console.log('\n4. 测试普通用户访问管理员功能...');
    try {
      await axios.get(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      console.log('✗ 测试失败：普通用户不应该能访问用户列表');
    } catch (error) {
      console.log('✓ 正确拒绝普通用户访问:', error.response.data.message);
    }

    // 5. 获取用户列表（管理员）
    console.log('\n5. 管理员获取用户列表...');
    try {
      const usersRes = await axios.get(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      });
      console.log('✓ 获取用户列表成功');
      console.log(`用户数量: ${usersRes.data.count}`);
      usersRes.data.data.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
      });
    } catch (error) {
      console.log('✗ 获取用户列表失败:', error.response.data.message);
    }

    // 6. 修改用户角色（超级管理员）
    console.log('\n6. 超级管理员修改用户角色...');
    try {
      const roleUpdateRes = await axios.put(
        `${API_URL}/users/${userId}/role`,
        { role: 'admin' },
        {
          headers: {
            'Authorization': `Bearer ${superAdminToken}`
          }
        }
      );
      console.log('✓ 角色更新成功');
      console.log(`用户新角色: ${roleUpdateRes.data.data.role}`);
    } catch (error) {
      console.log('✗ 角色更新失败:', error.response.data.message);
    }

    // 7. 普通用户尝试修改角色（应该失败）
    console.log('\n7. 测试普通用户修改角色...');
    try {
      await axios.put(
        `${API_URL}/users/${userId}/role`,
        { role: 'admin' },
        {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );
      console.log('✗ 测试失败：普通用户不应该能修改角色');
    } catch (error) {
      console.log('✓ 正确拒绝普通用户修改角色:', error.response.data.message);
    }

    console.log('\n=== 所有权限测试完成! ===');
  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message);
  }
}

testRBAC();
