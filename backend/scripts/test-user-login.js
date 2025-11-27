const bcrypt = require('./backend/node_modules/bcrypt');
const mysql = require('./backend/node_modules/mysql2/promise');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

const testUser = {
  email: 'gaurav@web.com',
  password: 'welcome',
  firstName: 'Gaurav',
  lastName: 'User'
};

async function testUserLogin() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'kayak_db'
    });

    console.log('✅ Connected to database\n');

    // Check if user exists
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [testUser.email]
    );

    if (users.length === 0) {
      console.log('❌ User does not exist. Creating user...\n');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      
      // Create user
      const [result] = await connection.execute(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
        [testUser.email, hashedPassword, testUser.firstName, testUser.lastName, 'user']
      );

      console.log('✅ User created successfully!');
      console.log(`   User ID: ${result.insertId}`);
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Name: ${testUser.firstName} ${testUser.lastName}\n`);
    } else {
      console.log('✅ User already exists:');
      console.log(`   User ID: ${users[0].id}`);
      console.log(`   Email: ${users[0].email}`);
      console.log(`   Name: ${users[0].first_name} ${users[0].last_name}`);
      console.log(`   Role: ${users[0].role}\n`);
      
      // Test password
      const validPassword = await bcrypt.compare(testUser.password, users[0].password_hash);
      if (validPassword) {
        console.log('✅ Password is correct!');
      } else {
        console.log('❌ Password is incorrect!');
        console.log('   Updating password...');
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        await connection.execute(
          'UPDATE users SET password_hash = ? WHERE email = ?',
          [hashedPassword, testUser.email]
        );
        console.log('✅ Password updated successfully!');
      }
    }

    // Test login query
    console.log('\n📋 Testing login query...');
    const [loginUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [testUser.email]
    );

    if (loginUsers.length > 0) {
      const user = loginUsers[0];
      const validPassword = await bcrypt.compare(testUser.password, user.password_hash);
      
      if (validPassword) {
        console.log('✅ Login test PASSED!');
        console.log(`   User can login with email: ${testUser.email}`);
        console.log(`   Password: ${testUser.password}`);
      } else {
        console.log('❌ Login test FAILED!');
        console.log('   Password does not match');
      }
    } else {
      console.log('❌ Login test FAILED!');
      console.log('   User not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️  MySQL Access Denied!');
      console.error('   Please check your MySQL credentials in backend/.env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Cannot connect to MySQL!');
      console.error('   Please make sure MySQL is running');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Run the test
testUserLogin();

