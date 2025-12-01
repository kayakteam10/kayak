/**
 * CacheRepository
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles caching operations
 * - Interface Segregation: Separate methods for different cache operations
 * - Dependency Inversion: Accepts Redis client as dependency
 * 
 * Batching Strategies:
 * - MGET/MSET for multiple keys
 * - Pipeline for bulk operations
 * - SCAN for pattern-based operations
 */

class CacheRepository {
    constructor(redisClient, logger) {
        this.redis = redisClient;
        this.defaultTTL = 900; // 15 minutes
        this.logger = logger;
    }

    /**
     * Get value from cache
     * Fails gracefully if Redis is unavailable
     * 
     * @param {string} key
     * @returns {Promise<string|null>}
     */
    async get(key) {
        try {
            if (!this.redis.isReady) {
                return null; // Fail gracefully
            }
            return await this.redis.get(key);
        } catch (error) {
            this.logger.error('Cache GET error:', error.message);
            return null; // Fail gracefully - app continues without cache
        }
    }

    /**
     * Set value in cache with TTL
     * 
     * @param {string} key
     * @param {string} value
     * @param {number} ttl - Time to live in seconds (default: 15 min)
     * @returns {Promise<boolean>}
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            if (!this.redis.isReady) {
                return false;
            }
            await this.redis.setEx(key, ttl, value);
            return true;
        } catch (error) {
            this.logger.error('Cache SET error:', error.message);
            return false;
        }
    }

    /**
     * Delete single key
     * 
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async delete(key) {
        try {
            if (!this.redis.isReady) {
                return false;
            }
            await this.redis.del(key);
            return true;
        } catch (error) {
            this.logger.error('Cache DELETE error:', error.message);
            return false;
        }
    }

    /**
     * Delete keys by pattern (for cache invalidation)
     * Batching: Uses SCAN to avoid blocking Redis
     * 
     * Example: deletePattern('flights:SFO:*')
     * 
     * @param {string} pattern - Redis pattern (e.g., 'flights:*')
     * @returns {Promise<number>} - Number of keys deleted
     */
    async deletePattern(pattern) {
        try {
            if (!this.redis.isReady) {
                return 0;
            }

            const keys = await this.scanKeys(pattern);

            if (keys.length > 0) {
                // Batching: Delete all keys in single operation
                await this.redis.del(keys);
            }

            return keys.length;
        } catch (error) {
            this.logger.error('Cache DELETE PATTERN error:', error.message);
            return 0;
        }
    }

    /**
     * Scan for keys matching pattern
     * Uses SCAN instead of KEYS to avoid blocking
     * 
     * @param {string} pattern
     * @returns {Promise<Array<string>>}
     */
    async scanKeys(pattern) {
        const keys = [];
        let cursor = 0;

        try {
            do {
                const result = await this.redis.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100 // Batch size
                });

                cursor = result.cursor;
                keys.push(...result.keys);
            } while (cursor !== 0);

            return keys;
        } catch (error) {
            this.logger.error('Cache SCAN error:', error.message);
            return [];
        }
    }

    /**
     * Get multiple keys (batching)
     * More efficient than multiple GET calls
     * 
     * @param {Array<string>} keys
     * @returns {Promise<Array<string|null>>}
     */
    async mget(keys) {
        try {
            if (!this.enabled || !this.redis.isReady || keys.length === 0) {
                return [];
            }
            return await this.redis.mGet(keys);
        } catch (error) {
            this.logger.error('Cache MGET error:', error.message);
            return [];
        }
    }

    /**
     * Set multiple keys (batching)
     * Uses pipeline for atomic multi-set with TTL
     * 
     * @param {Object} keyValuePairs - { key1: value1, key2: value2 }
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>}
     */
    async mset(keyValuePairs, ttl = 900) {
        try {
            if (!this.redis.isReady) {
                return false;
            }

            // Use pipeline for batching multiple operations
            const pipeline = this.redis.multi();

            for (const [key, value] of Object.entries(keyValuePairs)) {
                pipeline.setEx(key, ttl, value);
            }

            await pipeline.exec();
            return true;
        } catch (error) {
            this.logger.error('Cache MSET error:', error.message);
            return false;
        }
    }

    /**
     * Check if key exists
     * 
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async exists(key) {
        try {
            if (!this.redis.isReady) {
                return false;
            }
            const result = await this.redis.exists(key);
            return result === 1;
        } catch (error) {
            this.logger.error('Cache EXISTS error:', error.message);
            return false;
        }
    }

    /**
     * Get Time To Live for a key
     * 
     * @param {string} key
     * @returns {Promise<number>} - Seconds remaining, or -1 if no expiry
     */
    async ttl(key) {
        try {
            if (!this.enabled || !this.redis.isReady) {
                return -1;
            }
            return await this.redis.ttl(key);
        } catch (error) {
            console.error('Cache TTL error:', error.message);
            return -1;
        }
    }

    /**
     * Increment counter (for rate limiting, analytics)
     * 
     * @param {string} key
     * @param {number} amount - Increment by (default: 1)
     * @returns {Promise<number>} - New value
     */
    async increment(key, amount = 1) {
        try {
            if (!this.enabled || !this.redis.isReady) {
                return 0;
            }
            return await this.redis.incrBy(key, amount);
        } catch (error) {
            console.error('Cache INCREMENT error:', error.message);
            return 0;
        }
    }

    /**
     * Set with NX option (only if key doesn't exist)
     * Useful for distributed locks
     * 
     * @param {string} key
     * @param {string} value
     * @param {number} ttl
     * @returns {Promise<boolean>} - True if set, false if key already exists
     */
    async setNX(key, value, ttl = 900) {
        try {
            if (!this.enabled || !this.redis.isReady) {
                return false;
            }
            const result = await this.redis.set(key, value, {
                EX: ttl,
                NX: true
            });
            return result === 'OK';
        } catch (error) {
            console.error('Cache SETNX error:', error.message);
            return false;
        }
    }

    /**
     * Flush all cache (use with caution!)
     * 
     * @returns {Promise<boolean>}
     */
    async flushAll() {
        try {
            if (!this.enabled || !this.redis.isReady) {
                return false;
            }
            await this.redis.flushAll();
            console.warn('⚠️  Cache flushed (all keys deleted)');
            return true;
        } catch (error) {
            console.error('Cache FLUSH error:', error.message);
            return false;
        }
    }

    /**
     * Get cache statistics
     * 
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            if (!this.enabled || !this.redis.isReady) {
                return { connected: false };
            }

            const info = await this.redis.info('stats');
            const dbSize = await this.redis.dbSize();

            return {
                connected: true,
                totalKeys: dbSize,
                info: info
            };
        } catch (error) {
            console.error('Cache STATS error:', error.message);
            return { connected: false, error: error.message };
        }
    }
}

module.exports = CacheRepository;
