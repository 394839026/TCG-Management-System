const axios = require('axios');

async function testRegister() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      username: 'testuser456',
      email: 'test456@example.com',
      password: 'Test@123456'
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Error message:', error.message);
    if (error.response?.data) {
      console.error('Full response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRegister();
