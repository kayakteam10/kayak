const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kayak_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

dbPool.getConnection()
    .then(connection => {
        logger.info('✅ MySQL connected');
        connection.release();
    })
    .catch(err => {
        logger.error(`❌ MySQL connection error: ${err.message}`);
    });

module.exports = dbPool;
