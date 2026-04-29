const axios = require('axios');

async function testFunctions() {
    const BASE_URL = 'http://localhost:3000';
    
    console.log('=== 1. 登录 ===');
    try {
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@tcg.com',
            password: 'admin123456'
        });
        
        const token = loginRes.data.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('✓ 登录成功\n');
        
        console.log('=== 2. 测试店铺创建 ===');
        try {
            const shopRes = await axios.post(`${BASE_URL}/api/shops`, {
                name: '卡牌天堂2',
                description: '专业的卡牌交易和收藏',
                location: { address: '上海市浦东新区' }
            }, { headers });
            console.log('✓ 店铺创建成功:');
            console.log(JSON.stringify(shopRes.data, null, 2));
        } catch (err) {
            console.error('✗ 店铺创建失败:', err.response?.data || err.message);
        }
        
        console.log('\n=== 3. 测试战队创建 ===');
        try {
            const teamRes = await axios.post(`${BASE_URL}/api/teams`, {
                name: '龙之战队2',
                description: '最强卡牌战队'
            }, { headers });
            console.log('✓ 战队创建成功:');
            console.log(JSON.stringify(teamRes.data, null, 2));
        } catch (err) {
            console.error('✗ 战队创建失败:', err.response?.data || err.message);
        }
        
    } catch (err) {
        console.error('登录失败:', err.response?.data || err.message);
    }
}

testFunctions();
