require('dotenv').config();
const mysql = require('mysql2/promise');
const { faker } = require('@faker-js/faker');
const fs = require('fs');

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const TARGET_COUNT = 10000;
const BATCH_SIZE = 1000;

// City distribution: 80% SF + NYC, 20% others
const CITY_DISTRIBUTION = [
  { city: 'San Francisco', state: 'CA', weight: 40 },
  { city: 'New York', state: 'NY', weight: 40 },
  { city: 'Los Angeles', state: 'CA', weight: 5 },
  { city: 'Chicago', state: 'IL', weight: 5 },
  { city: 'Houston', state: 'TX', weight: 3 },
  { city: 'Phoenix', state: 'AZ', weight: 2 },
  { city: 'Philadelphia', state: 'PA', weight: 2 },
  { city: 'Miami', state: 'FL', weight: 2 },
  { city: 'Seattle', state: 'WA', weight: 1 }
];

function getWeightedCity() {
  const totalWeight = CITY_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  
  for (const item of CITY_DISTRIBUTION) {
    cumulative += item.weight;
    if (random <= cumulative) {
      return item;
    }
  }
  
  return CITY_DISTRIBUTION[0];
}

// Use counters to guarantee uniqueness across all batches
let ssnCounter = 1;
let emailCounter = 1;

function generateSSN() {
  // Format: ###-##-#### using counter to ensure uniqueness
  const area = 100 + (ssnCounter % 799); // 100-899
  const group = 10 + (Math.floor(ssnCounter / 799) % 89); // 10-99
  const serial = 1000 + (ssnCounter % 8999); // 1000-9999
  ssnCounter++;
  return `${area}-${group}-${String(serial).padStart(4, '0')}`;
}

function generateUser() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const cityInfo = getWeightedCity();
  
  // Generate unique email using counter
  const emailDomain = faker.helpers.arrayElement(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com']);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailCounter}@${emailDomain}`;
  emailCounter++;
  
  return {
    ssn: generateSSN(),
    first_name: firstName,
    last_name: lastName,
    email: email,
    password_hash: faker.internet.password({ length: 60, prefix: '$2a$10$' }),
    phone_number: faker.phone.number('###-###-####'),
    address: faker.location.streetAddress(),
    city: cityInfo.city,
    state: cityInfo.state,
    zip_code: faker.location.zipCode('#####'),
    role: faker.helpers.weightedArrayElement([
      { weight: 95, value: 'user' },
      { weight: 5, value: 'admin' }
    ]),
    credit_card_last4: faker.finance.creditCardNumber('####').slice(-4)
  };
}

async function seedUsers() {
  console.log('='.repeat(80));
  console.log('SEEDING USERS');
  console.log('='.repeat(80));
  console.log();

  const connection = await mysql.createConnection(MYSQL_CONFIG);
  const insertedIds = [];
  
  try {
    // Insert admin user first
    console.log('👑 Creating admin user...');
    const bcrypt = require('bcrypt');
    const adminPassword = await bcrypt.hash('abcd', 10);
    
    const adminSql = `
      INSERT INTO users (
        ssn, first_name, last_name, email, password_hash, phone_number,
        address, city, state, zip_code, role, credit_card_last4
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [adminResult] = await connection.query(adminSql, [
      '123-45-6789',
      'John',
      'Doe',
      'john.doe@email.com',
      adminPassword,
      '555-123-4567',
      '123 Admin Street',
      'San Francisco',
      'CA',
      '94102',
      'admin',
      '1234'
    ]);
    
    insertedIds.push(adminResult.insertId);
    console.log(`✅ Admin user created: john.doe@email.com (ID: ${adminResult.insertId})`);
    console.log();
    
    // Get current count
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM users');
    const currentCount = countResult[0].count;
    console.log(`📊 Current user count: ${currentCount.toLocaleString()}`);
    console.log(`🎯 Target: Add ${TARGET_COUNT.toLocaleString()} new users (including admin)`);
    console.log();

    const remainingUsers = TARGET_COUNT - 1; // -1 for admin
    const batches = Math.ceil(remainingUsers / BATCH_SIZE);
    let totalInserted = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = Date.now();
      const users = [];
      const remainingCount = remainingUsers - totalInserted;
      const currentBatchSize = Math.min(BATCH_SIZE, remainingCount);
      
      // Generate users for this batch
      for (let i = 0; i < currentBatchSize; i++) {
        users.push(generateUser());
      }
      
      // Batch insert
      const values = users.map(user => [
        user.ssn,
        user.first_name,
        user.last_name,
        user.email,
        user.password_hash,
        user.phone_number,
        user.address,
        user.city,
        user.state,
        user.zip_code,
        user.role,
        user.credit_card_last4
      ]);
      
      const sql = `
        INSERT INTO users (
          ssn, first_name, last_name, email, password_hash, phone_number,
          address, city, state, zip_code, role, credit_card_last4
        ) VALUES ?
      `;
      
      const [result] = await connection.query(sql, [values]);
      
      // Store inserted IDs
      const firstId = result.insertId;
      for (let i = 0; i < currentBatchSize; i++) {
        insertedIds.push(firstId + i);
      }
      
      totalInserted += currentBatchSize;
      const batchTime = Date.now() - batchStart;
      const progress = ((batch + 1) / batches * 100).toFixed(1);
      
      console.log(`✅ Batch ${batch + 1}/${batches} (${progress}%) - ${currentBatchSize} users inserted in ${batchTime}ms`);
    }
    
    console.log();
    console.log(`✅ Successfully inserted ${totalInserted.toLocaleString()} users + 1 admin = ${totalInserted + 1} total`);
    console.log();

    // Verify insertion
    console.log('🔍 Verification:');
    const [newCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`   Total users in database: ${newCount[0].count.toLocaleString()}`);
    
    // City distribution check
    const [cityDist] = await connection.query(`
      SELECT city, COUNT(*) as count 
      FROM users 
      GROUP BY city 
      ORDER BY count DESC 
      LIMIT 10
    `);
    console.log('\n   Top 10 cities:');
    cityDist.forEach(row => {
      const percentage = (row.count / newCount[0].count * 100).toFixed(1);
      console.log(`      ${row.city.padEnd(20)}: ${row.count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Sample users
    const [samples] = await connection.query('SELECT id, first_name, last_name, email, city, state FROM users ORDER BY id DESC LIMIT 5');
    console.log('\n   Sample users (most recent):');
    samples.forEach(user => {
      console.log(`      ID ${user.id}: ${user.first_name} ${user.last_name} - ${user.email} (${user.city}, ${user.state})`);
    });
    
    // Save IDs to file
    const idsData = {
      count: insertedIds.length,
      ids: insertedIds,
      minId: Math.min(...insertedIds),
      maxId: Math.max(...insertedIds),
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('user-ids.json', JSON.stringify(idsData, null, 2));
    console.log('\n💾 User IDs saved to user-ids.json');
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ USER SEEDING COMPLETE');
    console.log('='.repeat(80));
    console.log();
    
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedUsers();
