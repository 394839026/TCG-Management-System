const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test456@example.com',
      password: 'Test@123456'
    });
    console.log('Login Success:', response.data);
  } catch (error) {
    console.error('Login Error status:', error.response?.status);
    console.error('Login Error data:', error.response?.data);
    console.error('Error message:', error.message);
  }
}

testLogin();
