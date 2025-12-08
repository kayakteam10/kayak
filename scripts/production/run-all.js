require('dotenv').config();
const { execSync } = require('child_process');

const SCRIPTS = [
  { name: 'Setup Validation', script: '00-setup.js', critical: true },
  { name: 'Seed Users', script: '01-seed-users.js', critical: true },
  { name: 'Seed Hotels', script: '02-seed-hotels.js', critical: true },
  { name: 'Seed Cars', script: '03-seed-cars.js', critical: true },
  { name: 'Seed Flights', script: '04-seed-flights.js', critical: true },
  { name: 'Seed Bookings', script: '05-seed-bookings.js', critical: true },
  { name: 'Seed Reviews', script: '06-seed-reviews.js', critical: false }
];

async function runAll() {
  console.log('='.repeat(80));
  console.log('KAYAK PRODUCTION DATA SEEDING - FULL EXECUTION');
  console.log('='.repeat(80));
  console.log();
  console.log('This will seed the production database with:');
  console.log('  • 10,000 users');
  console.log('  • 10,000 hotels');
  console.log('  • 5,000 cars');
  console.log('  • 20,000 flights (10,000 pairs)');
  console.log('  • 100,000 bookings');
  console.log('  • 50,000 reviews (MongoDB)');
  console.log();
  console.log('⚠️  WARNING: This will take several minutes to complete.');
  console.log('    Do NOT interrupt the process.');
  console.log();
  console.log('='.repeat(80));
  console.log();

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < SCRIPTS.length; i++) {
    const step = SCRIPTS[i];
    const stepNum = i + 1;
    
    console.log(`\n${'▶'.repeat(3)} STEP ${stepNum}/${SCRIPTS.length}: ${step.name} ${'▶'.repeat(3)}\n`);
    
    const stepStart = Date.now();
    
    try {
      execSync(`node ${step.script}`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      
      const stepTime = ((Date.now() - stepStart) / 1000).toFixed(1);
      results.push({
        step: step.name,
        status: 'SUCCESS',
        time: stepTime
      });
      
      console.log(`\n✅ Step ${stepNum} completed in ${stepTime}s\n`);
      
    } catch (error) {
      const stepTime = ((Date.now() - stepStart) / 1000).toFixed(1);
      results.push({
        step: step.name,
        status: 'FAILED',
        time: stepTime,
        error: error.message
      });
      
      console.error(`\n❌ Step ${stepNum} FAILED after ${stepTime}s\n`);
      
      if (step.critical) {
        console.error('This is a critical step. Aborting remaining steps.');
        break;
      } else {
        console.log('This is not a critical step. Continuing...');
      }
    }
  }

  // ========================================
  // Final Summary
  // ========================================
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log();
  
  results.forEach((result, index) => {
    const status = result.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${status} Step ${index + 1}: ${result.step.padEnd(30)} - ${result.time}s`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log();
  console.log(`⏱️  Total execution time: ${totalTime} minutes`);
  
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failCount = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`📊 Results: ${successCount} succeeded, ${failCount} failed`);
  console.log();
  
  if (failCount === 0) {
    console.log('='.repeat(80));
    console.log('🎉 ALL SEEDING COMPLETED SUCCESSFULLY! 🎉');
    console.log('='.repeat(80));
    console.log();
    console.log('Next Steps:');
    console.log('1. Verify data in MySQL:');
    console.log('   mysql -h kayak-mysql... -u admin -p -D kayak_db');
    console.log('   SELECT COUNT(*) FROM users;');
    console.log('   SELECT COUNT(*) FROM hotels;');
    console.log('   SELECT COUNT(*) FROM cars;');
    console.log('   SELECT COUNT(*) FROM flights;');
    console.log('   SELECT COUNT(*) FROM bookings;');
    console.log();
    console.log('2. Verify reviews in MongoDB:');
    console.log('   mongosh "mongodb://localhost:27017/kayak_db"');
    console.log('   db.reviews.countDocuments()');
    console.log();
  } else {
    console.log('='.repeat(80));
    console.log('⚠️  SEEDING COMPLETED WITH ERRORS');
    console.log('='.repeat(80));
    console.log();
    console.log('Please check the errors above and re-run failed steps manually.');
    console.log();
  }
}

// Run with error handling
runAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
