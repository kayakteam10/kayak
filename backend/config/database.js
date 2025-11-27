const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL Database Configuration
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'kayak_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL database connected:', process.env.MYSQL_DATABASE || 'kayak_db');
    connection.release();
  })
  .catch(err => {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('❌ MySQL Access Denied - Password required!');
      console.error('Please set MYSQL_PASSWORD in .env file:');
      console.error('   MYSQL_PASSWORD=your_mysql_password');
      console.error('');
      console.error('If you forgot your MySQL password, reset it:');
      console.error('   mysqladmin -u root password "newpassword"');
    } else {
      console.error('❌ MySQL connection error:', err.message);
      console.error('Make sure MySQL is running and database exists.');
    }
  });

// Helper function for queries (to match existing code style)
pool.query = async (sql, params = []) => {
  try {
    // Convert PostgreSQL-style $1, $2 to MySQL ?
    let convertedSql = sql;
    let convertedParams = params;
    
    // Extract RETURNING clause BEFORE converting parameters
    let returningClause = null;
    let tableName = null;
    let hasReturning = sql.toUpperCase().includes('RETURNING');
    
    if (hasReturning) {
      const returnMatch = sql.match(/RETURNING\s+(.+?)(?:\s*$|;)/i);
      const tableMatch = sql.match(/INTO\s+(\w+)/i);
      
      if (returnMatch && tableMatch) {
        returningClause = returnMatch[1];
        tableName = tableMatch[1];
        // Remove RETURNING clause from SQL
        convertedSql = sql.replace(/\s+RETURNING\s+.+$/i, '');
      }
    }
    
    // If using PostgreSQL-style parameters ($1, $2), convert them
    if (/\$\d+/.test(convertedSql)) {
      convertedParams = [];
      convertedSql = convertedSql.replace(/\$(\d+)/g, (match, num) => {
        const index = parseInt(num) - 1;
        if (params[index] !== undefined) {
          convertedParams.push(params[index]);
        }
        return '?';
      });
    }
    
    // Execute the query (without RETURNING clause)
    const [result] = await pool.execute(convertedSql, convertedParams);
    
    // Handle RETURNING clause for INSERT (MySQL doesn't support RETURNING)
    if (hasReturning && returningClause && tableName && result.insertId) {
      const cols = returningClause.split(',').map(c => c.trim());
      const selectSql = `SELECT ${cols.join(', ')} FROM ${tableName} WHERE id = ?`;
      const [insertedRows] = await pool.execute(selectSql, [result.insertId]);
      return { rows: insertedRows };
    }
    
    // Handle INSERT statements without RETURNING
    if (sql.trim().toUpperCase().startsWith('INSERT')) {
      if (result.insertId) {
        // Return rows with inserted data if RETURNING was requested
        if (hasReturning) {
          // Already handled above
          return { rows: [] };
        }
        return { rows: [{ id: result.insertId }] };
      }
      return { rows: [] };
    }
    
    // Handle SELECT and other queries
    return { rows: Array.isArray(result) ? result : [] };
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
};

module.exports = pool;
