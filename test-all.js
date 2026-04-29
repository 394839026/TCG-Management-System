const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

let token1 = '';
let token2 = '';
let user1Id = '';
let user2Id = '';
let teamId = '';
let shopId = '';
let friendRequestId = '';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testAuth() {
  console.log('='.repeat(50));
  console.log('🚀 测试认证功能');
  console.log('='.repeat(50));

  try {
    console.log('\n📝 尝试注册新用户1...');
    try {
      const reg1 = await axios.post(`${API_BASE_URL}/auth/register`, {
        username: `admin${Date.now()}`,
        email: `admin${Date.now()}@test.com`,
        password: 'admin123'
      });
      console.log('✅ 用户1注册成功');
    } catch (e) {
      console.log('ℹ️ 无需注册');
    }

    console.log('\n📝 尝试注册新用户2...');
    try {
      const reg2 = await axios.post(`${API_BASE_URL}/auth/register`, {
        username: `player${Date.now()}`,
        email: `player${Date.now()}@test.com`,
        password: 'player123'
      });
      console.log('✅ 用户2注册成功');
    } catch (e) {
      console.log('ℹ️ 无需注册');
    }

    console.log('\n🔑 使用已存在的用户登录...');
    const login1 = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@tcg.com',
      password: 'admin123456'
    });
    token1 = login1.data.data.token;
    user1Id = login1.data.data._id;
    console.log('✅ 用户1登录成功:', login1.data.data.username);

    console.log('\n🔑 登录用户2...');
    const login2 = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@tcg.com',
      password: 'test123456'
    });
    token2 = login2.data.data.token;
    user2Id = login2.data.data._id;
    console.log('✅ 用户2登录成功:', login2.data.data.username);

    return true;
  } catch (error) {
    console.error('❌ 认证测试失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testTeam() {
  console.log('\n' + '='.repeat(50));
  console.log('🏆 测试战队功能');
  console.log('='.repeat(50));

  try {
    console.log('\n➕ 创建战队...');
    const create = await axios.post(`${API_BASE_URL}/teams`, {
      name: '测试战队',
      description: '这是一个测试战队'
    }, { headers: { Authorization: `Bearer ${token1}` } });
    teamId = create.data.data._id;
    console.log('✅ 战队创建成功! ID:', teamId);

    console.log('\n📋 获取战队列表...');
    const list = await axios.get(`${API_BASE_URL}/teams`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 战队列表获取成功，共', list.data.data?.length, '个战队');

    console.log('\n👁️ 获取战队详情...');
    const detail = await axios.get(`${API_BASE_URL}/teams/${teamId}`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 战队详情获取成功:', detail.data.data.name);

    console.log('\n✏️ 更新战队...');
    const update = await axios.put(`${API_BASE_URL}/teams/${teamId}`, {
      name: '测试战队（已更新）',
      description: '这是更新后的描述'
    }, { headers: { Authorization: `Bearer ${token1}` } });
    console.log('✅ 战队更新成功');

    return true;
  } catch (error) {
    console.error('❌ 战队测试失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testShop() {
  console.log('\n' + '='.repeat(50));
  console.log('🏪 测试商店功能');
  console.log('='.repeat(50));

  try {
    console.log('\n➕ 创建商店...');
    const create = await axios.post(`${API_BASE_URL}/shops`, {
      name: '测试商店',
      description: '这是一个测试商店',
      location: { address: '测试地址' }
    }, { headers: { Authorization: `Bearer ${token1}` } });
    shopId = create.data.data._id;
    console.log('✅ 商店创建成功! ID:', shopId);

    console.log('\n📋 获取商店列表...');
    const list = await axios.get(`${API_BASE_URL}/shops`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 商店列表获取成功，共', list.data.data?.length, '个商店');

    console.log('\n👁️ 获取商店详情...');
    const detail = await axios.get(`${API_BASE_URL}/shops/${shopId}`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 商店详情获取成功:', detail.data.data.name);

    console.log('\n✏️ 更新商店...');
    const update = await axios.put(`${API_BASE_URL}/shops/${shopId}`, {
      name: '测试商店（已更新）',
      description: '这是更新后的描述'
    }, { headers: { Authorization: `Bearer ${token1}` } });
    console.log('✅ 商店更新成功');

    return true;
  } catch (error) {
    console.error('❌ 商店测试失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testFriends() {
  console.log('\n' + '='.repeat(50));
  console.log('👥 测试好友功能');
  console.log('='.repeat(50));

  try {
    console.log('\n🔍 搜索用户...');
    const search = await axios.get(`${API_BASE_URL}/friends/search?query=test`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 用户搜索成功，找到:', search.data.data?.length, '个用户');

    console.log('\n👥 查看现有好友列表...');
    const friends = await axios.get(`${API_BASE_URL}/friends`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 好友列表获取成功，共', friends.data.data?.length, '个好友');

    console.log('\n📋 查看好友请求列表...');
    const requests = await axios.get(`${API_BASE_URL}/friends/requests`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 好友请求获取成功');

    return true;
  } catch (error) {
    console.error('❌ 好友测试失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testInventory() {
  console.log('\n' + '='.repeat(50));
  console.log('📦 测试库存功能');
  console.log('='.repeat(50));

  try {
    console.log('\n➕ 创建物品...');
    const create = await axios.post(`${API_BASE_URL}/inventory`, {
      itemName: '测试卡牌',
      itemType: 'card',
      quantity: 10,
      condition: 'near_mint',
      value: 100
    }, { headers: { Authorization: `Bearer ${token1}` } });
    const itemId = create.data.data._id;
    console.log('✅ 物品创建成功!');

    console.log('\n📋 获取库存列表...');
    const list = await axios.get(`${API_BASE_URL}/inventory`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 库存列表获取成功，共', list.data.data?.length, '个物品');

    console.log('\n✏️ 更新物品...');
    const update = await axios.put(`${API_BASE_URL}/inventory/${itemId}`, {
      quantity: 20
    }, { headers: { Authorization: `Bearer ${token1}` } });
    console.log('✅ 物品更新成功');

    console.log('\n❌ 删除物品...');
    const deleteItem = await axios.delete(`${API_BASE_URL}/inventory/${itemId}`, { 
      headers: { Authorization: `Bearer ${token1}` } 
    });
    console.log('✅ 物品删除成功');

    return true;
  } catch (error) {
    console.error('❌ 库存测试失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testCleanup() {
  console.log('\n' + '='.repeat(50));
  console.log('🧹 清理测试数据');
  console.log('='.repeat(50));

  try {
    if (teamId) {
      console.log('\n🗑️ 删除测试战队...');
      await axios.delete(`${API_BASE_URL}/teams/${teamId}`, { 
        headers: { Authorization: `Bearer ${token1}` } 
      });
      console.log('✅ 战队删除成功');
    }

    if (shopId) {
      console.log('\n🗑️ 删除测试商店...');
      await axios.delete(`${API_BASE_URL}/shops/${shopId}`, { 
        headers: { Authorization: `Bearer ${token1}` } 
      });
      console.log('✅ 商店删除成功');
    }

    return true;
  } catch (error) {
    console.error('❌ 清理失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始全面测试TCG卡牌管理系统...\n');
  console.log('API URL:', API_BASE_URL);

  const results = {};

  results.auth = await testAuth();
  await sleep(500);
  
  results.team = await testTeam();
  await sleep(500);
  
  results.shop = await testShop();
  await sleep(500);
  
  results.friends = await testFriends();
  await sleep(500);
  
  results.inventory = await testInventory();
  await sleep(500);
  
  results.cleanup = await testCleanup();

  console.log('\n' + '='.repeat(50));
  console.log('📊 测试总结');
  console.log('='.repeat(50));

  let passed = 0;
  let total = 0;
  Object.entries(results).forEach(([key, value]) => {
    total++;
    if (value) {
      passed++;
      console.log(`✅ ${key.toUpperCase()}: 通过`);
    } else {
      console.log(`❌ ${key.toUpperCase()}: 失败`);
    }
  });

  console.log(`\n📈 总通过率: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
  console.log('\n🎉 测试完成!');
}

main().catch(error => {
  console.error('❌ 测试运行失败:', error);
  process.exit(1);
});
