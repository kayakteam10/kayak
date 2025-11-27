const axios = require('axios');

const testUser = {
  email: 'gaurav@web.com',
  password: 'welcome'
};

const API_URL = 'http://localhost:8089';

async function testLogin() {
  console.log('🧪 Testing Login API for user:', testUser.email);
  console.log('='.repeat(50));
  
  try {
    // Test login
    console.log('\n1️⃣  Testing Login...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    console.log('✅ Login successful!');
    console.log('   Token:', loginResponse.data.token ? 'Received' : 'Missing');
    console.log('   User:', loginResponse.data.user);
    console.log('   Message:', loginResponse.data.message);
    
    // Test with invalid password
    console.log('\n2️⃣  Testing with invalid password...');
    try {
      await axios.post(`${API_URL}/api/auth/login`, {
        email: testUser.email,
        password: 'wrongpassword'
      });
      console.log('❌ Should have failed but succeeded');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('✅ Correctly rejected invalid password');
      } else {
        console.log('❌ Unexpected error:', err.message);
      }
    }
    
    // Test with non-existent user
    console.log('\n3️⃣  Testing with non-existent user...');
    try {
      await axios.post(`${API_URL}/api/auth/login`, {
        email: 'nonexistent@test.com',
        password: 'password'
      });
      console.log('❌ Should have failed but succeeded');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('✅ Correctly rejected non-existent user');
      } else {
        console.log('❌ Unexpected error:', err.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All login tests completed!');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to backend server!');
      console.log('   Please make sure the backend is running on port 8089');
      console.log('   Run: cd kayak-app/backend && npm start');
    } else if (error.response) {
      console.log('❌ Login failed!');
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.error);
      
      if (error.response.status === 401) {
        console.log('\n⚠️  User may not exist. Creating user...');
        await createUser();
      }
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

async function createUser() {
  try {
    console.log('\n📝 Registering user...');
    const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
      email: testUser.email,
      password: testUser.password,
      firstName: 'Gaurav',
      lastName: 'User',
      role: 'user'
    });
    
    console.log('✅ User created successfully!');
    console.log('   User:', registerResponse.data.user);
    
    // Try login again
    console.log('\n🔄 Retrying login...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    console.log('✅ Login successful after registration!');
    console.log('   Token:', loginResponse.data.token ? 'Received' : 'Missing');
    console.log('   User:', loginResponse.data.user);
    
  } catch (err) {
    if (err.response) {
      if (err.response.status === 400 && err.response.data.error === 'User already exists') {
        console.log('⚠️  User already exists. Password may be incorrect.');
        console.log('   Please check the password or update it in the database.');
      } else {
        console.log('❌ Registration failed:', err.response.data.error);
      }
    } else {
      console.log('❌ Error:', err.message);
    }
  }
}

// Run the test
testLogin();

