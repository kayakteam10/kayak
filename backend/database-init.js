const db = require('./config/database');
const fs = require('fs');
const path = require('path');

// Read and execute SQLite schema
const schemaPath = path.join(__dirname, '../database/schema-sqlite.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split by semicolons and clean up statements
const statements = schema
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

// Execute schema initialization
db.serialize(() => {
  db.run('BEGIN TRANSACTION');
  
  statements.forEach((statement, index) => {
    db.run(statement, (err) => {
      if (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.error(`Error in statement ${index + 1}:`, err.message);
          console.error('Statement:', statement.substring(0, 100));
        }
      }
    });
  });
  
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing:', err);
      db.run('ROLLBACK');
    } else {
      console.log('Database schema initialized successfully!');
    }
  });
});

module.exports = db;
