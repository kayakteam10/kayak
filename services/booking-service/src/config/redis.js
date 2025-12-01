const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('❌ Redis max retries reached');
                return new Error('Redis max retries reached');
            }
            return retries * 100; // Exponential backoff
        }
    }
});

redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
});

redisClient.on('connect', () => {
    console.log('🔄 Redis connecting...');
});

redisClient.on('ready', () => {
    console.log('✅ Redis connected and ready');
});

redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
});

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('❌ Redis connection failed:', err.message);
        console.log('⚠️  Service will continue without caching');
    }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
    await redisClient.quit();
    process.exit(0);
});

module.exports = redisClient;
