const axios = require('axios');

async function testTeamFunctions() {
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
        
        console.log('=== 2. 获取战队列表 ===');
        try {
            const teamsRes = await axios.get(`${BASE_URL}/api/teams`, { headers });
            const teamId = teamsRes.data.data[0]?._id;
            console.log('✓ 战队列表获取成功');
            if (teamId) {
                console.log(`  测试战队ID: ${teamId}\n`);
                
                console.log('=== 3. 查看战队详情 ===');
                try {
                    const detailRes = await axios.get(`${BASE_URL}/api/teams/${teamId}`, { headers });
                    console.log('✓ 战队详情获取成功');
                    console.log(JSON.stringify(detailRes.data, null, 2));
                } catch (err) {
                    console.error('✗ 战队详情获取失败:', err.response?.data || err.message);
                }
                
                console.log('\n=== 4. 更新战队信息 ===');
                try {
                    const updateRes = await axios.put(`${BASE_URL}/api/teams/${teamId}`, {
                        name: '龙之战队2 (已更新)',
                        description: '这是更新后的描述'
                    }, { headers });
                    console.log('✓ 战队更新成功');
                    console.log(JSON.stringify(updateRes.data, null, 2));
                } catch (err) {
                    console.error('✗ 战队更新失败:', err.response?.data || err.message);
                }
                
                console.log('\n=== 5. 删除战队 ===');
                try {
                    const deleteRes = await axios.delete(`${BASE_URL}/api/teams/${teamId}`, { headers });
                    console.log('✓ 战队删除成功');
                    console.log(JSON.stringify(deleteRes.data, null, 2));
                } catch (err) {
                    console.error('✗ 战队删除失败:', err.response?.data || err.message);
                }
            } else {
                console.log('没有找到战队，先创建一个测试战队');
            }
        } catch (err) {
            console.error('✗ 战队列表获取失败:', err.response?.data || err.message);
        }
        
    } catch (err) {
        console.error('登录失败:', err.response?.data || err.message);
    }
}

testTeamFunctions();
