const axios = require('axios');

async function testAPI() {
  try {
    // 登录获取token
    const loginRes = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });

    console.log('登录成功:', loginRes.data.user.username);

    const token = loginRes.data.token;

    // 获取战队详情
    const teamRes = await axios.get('http://localhost:8000/api/teams/69f24fc569845bee15610d8c', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const team = teamRes.data.data;

    console.log('\n=== 战队数据 ===');
    console.log('team.id:', team.id);
    console.log('team.owner:', team.owner);
    console.log('typeof team.owner:', typeof team.owner);
    console.log('team.members.length:', team.members?.length);

    if (team.members && team.members.length > 0) {
      team.members.forEach((m, i) => {
        console.log(`\n成员 ${i + 1}:`);
        console.log('  user:', m.user);
        console.log('  typeof user:', typeof m.user);
        console.log('  role:', m.role);
      });
    }

    console.log('\n=== 关键比较 ===');
    console.log('user._id: 69f1d72462252a727af6f3e2');
    console.log('team.owner: 69f1d72462252a727af6f3e2');
    console.log('String(team.owner) === String(user._id):', String(team.owner) === '69f1d72462252a727af6f3e2');

  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

testAPI();
