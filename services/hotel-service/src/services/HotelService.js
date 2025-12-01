/**
 * HotelService
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only business logic for hotels
 * - Open/Closed: Extensible for new hotel types without modification
 * - Dependency Inversion: Depends on repository interfaces
 * 
 * Business Rules:
 * - Cache hotel searches for 15 minutes
 * - Validate all inputs before database queries
 * - Publish Kafka events for analytics
 * - Invalidate cache on availability changes
 */

const Joi = require('joi');
const logger = require('../utils/logger');

class HotelService {
    constructor(hotelRepo, cacheRepo, kafkaProducer = null, mongoDb = null) {
        this.hotelRepo = hotelRepo;
        this.cacheRepo = cacheRepo;
        this.kafka = kafkaProducer;
        this.mongoDb = mongoDb;
    }

    /**
     * Search hotels with caching
     * Pattern: Read-Through Cache
     * 
     * @param {Object} filters
     * @returns {Promise<Array>}
     */
    async searchHotels(filters) {
        // 1. Validate filters
        const validated = this.validateSearchFilters(filters);

        // 2. Generate cache key
        const cacheKey = this.generateCacheKey(validated);

        // 3. Check cache (Read-Through Caching)
        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            logger.info(`✅ Cache HIT: ${cacheKey}`);
            return JSON.parse(cached);
        }

        logger.info(`❌ Cache MISS: ${cacheKey}`);

        // 4. Query database
        const hotels = await this.hotelRepo.searchHotels(validated);

        // 5. Apply business rules & processing
        const processed = this.processHotels(hotels, validated);

        // 6. Cache results (Write-Through Caching)
        await this.cacheRepo.set(
            cacheKey,
            JSON.stringify(processed),
            900  // 15 min TTL
        );

        // 7. Publish Kafka event (Fire-and-forget)
        await this.publishEvent('hotel.searched', {
            filters: validated,
            resultsCount: hotels.length,
            timestamp: new Date().toISOString()
        });

        return processed;
    }

    /**
     * Get hotel details by ID with caching
     * 
     * @param {number} hotelId
     * @returns {Promise<Object>}
     */
    async getHotelById(hotelId) {
        const cacheKey = `hotel:${hotelId}`;

        // Check cache
        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query database
        const hotel = await this.hotelRepo.findById(hotelId);

        if (!hotel) {
            throw new Error('Hotel not found');
        }

        // Get images from MongoDB (if available)
        if (this.mongoDb) {
            try {
                const images = await this.mongoDb.collection('hotel_images')
                    .find({ hotel_id: hotelId })
                    .limit(10)
                    .toArray();

                hotel.images = images.map(img => img.url || img.image_url);
            } catch (error) {
                logger.error(`MongoDB image fetch error: ${error.message}`);
                hotel.images = [];
            }
        } else {
            hotel.images = [];
        }

        // Cache result
        await this.cacheRepo.set(cacheKey, JSON.stringify(hotel), 3600); // 1 hour

        return hotel;
    }

    /**
     * Get room types for a hotel
     * 
     * @param {number} hotelId
     * @returns {Promise<Array>}
     */
    async getRoomTypes(hotelId) {
        const cacheKey = `hotel:${hotelId}:rooms`;

        // Check cache
        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query database
        const rooms = await this.hotelRepo.getRoomTypes(hotelId);

        // Cache (shorter TTL due to availability changes)
        await this.cacheRepo.set(cacheKey, JSON.stringify(rooms), 300); // 5 min

        return rooms;
    }

    /**
     * Reserve rooms (temporary hold)
     * Transaction with cache invalidation
     * 
     * @param {number} hotelId
     * @param {number} roomCount
     * @returns {Promise<Object>}
     */
    async reserveRooms(hotelId, roomCount) {
        // 1. Validate inputs
        if (!roomCount || roomCount < 1) {
            throw new Error('Invalid room count');
        }

        // 2. Business rule: Max 10 rooms per booking
        if (roomCount > 10) {
            throw new Error('Maximum 10 rooms allowed per booking');
        }

        // 3. Reserve rooms (database transaction)
        const result = await this.hotelRepo.reserveRooms(hotelId, roomCount);

        // 4. Invalidate cache (cache-aside pattern)
        await this.invalidateHotelCache(hotelId);

        // 5. Publish Kafka event
        await this.publishEvent('hotel.rooms.reserved', {
            hotelId,
            roomCount,
            timestamp: new Date().toISOString()
        });

        return result;
    }

    /**
     * Release rooms (for cancellations)
     * Called by Kafka consumer
     * 
     * @param {number} hotelId
     * @param {number} roomCount
     * @returns {Promise<Object>}
     */
    async releaseRooms(hotelId, roomCount) {
        // Release rooms (database transaction)
        const result = await this.hotelRepo.releaseRooms(hotelId, roomCount);

        // Invalidate cache
        await this.invalidateHotelCache(hotelId);

        // Publish event
        await this.publishEvent('hotel.rooms.released', {
            hotelId,
            roomCount,
            timestamp: new Date().toISOString()
        });

        return result;
    }

    /**
     * Update hotel availability (from booking confirmation)
     * Called by Kafka consumer
     * 
     * @param {number} hotelId
     * @param {number} roomsBooked
     * @returns {Promise<Object>}
     */
    async updateAvailability(hotelId, roomsBooked) {
        const result = await this.hotelRepo.updateAvailability(hotelId, roomsBooked);

        // Invalidate cache
        await this.invalidateHotelCache(hotelId);

        return result;
    }

    /**
     * Search cities/hotels (autocomplete)
     * 
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async searchCities(query) {
        if (!query || query.length < 2) {
            return [];
        }

        const cacheKey = `cities:search:${query.toLowerCase()}`;

        // Check cache
        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query database
        const results = await this.hotelRepo.searchCities(query);

        // Cache (1 hour - cities don't change often)
        await this.cacheRepo.set(cacheKey, JSON.stringify(results), 3600);

        return results;
    }

    // ========== Private Helper Methods ==========

    /**
     * Validate search filters
     * Uses Joi for validation
     */
    validateSearchFilters(filters) {
        const schema = Joi.object({
            location: Joi.string().min(2).required(),
            checkIn: Joi.date().iso().min('now').required(),
            checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
            guests: Joi.number().integer().min(1).max(10).default(2)
        });

        const { error, value } = schema.validate(filters);

        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
        }

        return value;
    }

    /**
     * Generate cache key for hotel search
     * Pattern: hotels:{location}:{checkIn}:{checkOut}:{guests}
     */
    generateCacheKey(filters) {
        const { location, checkIn, checkOut, guests } = filters;
        const checkInStr = typeof checkIn === 'string' ? checkIn : checkIn.toISOString().split('T')[0];
        const checkOutStr = typeof checkOut === 'string' ? checkOut : checkOut.toISOString().split('T')[0];
        const cleanLocation = location.toLowerCase().replace(/\s+/g, '-');
        return `hotels:${cleanLocation}:${checkInStr}:${checkOutStr}:${guests}`;
    }

    /**
     * Process hotels - add calculated fields
     * Business logic: Calculate total price for stay
     */
    processHotels(hotels, filters) {
        return hotels.map(hotel => {
            const pricePerNight = parseFloat(hotel.price_per_night) || 0;

            // Calculate number of nights
            const checkIn = new Date(filters.checkIn);
            const checkOut = new Date(filters.checkOut);
            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

            // Calculate total price
            const totalPrice = pricePerNight * nights;

            return {
                ...hotel,
                price_per_night: pricePerNight.toFixed(2),
                total_price: totalPrice.toFixed(2),
                nights: nights,
                available: hotel.available_rooms >= 1,
                star_rating: hotel.star_rating || 0,
                user_rating: parseFloat(hotel.user_rating) || 0
            };
        });
    }

    /**
     * Invalidate all cache related to a hotel
     * Cache-aside pattern
     */
    async invalidateHotelCache(hotelId) {
        // Delete specific hotel cache
        await this.cacheRepo.delete(`hotel:${hotelId}`);
        await this.cacheRepo.delete(`hotel:${hotelId}:rooms`);

        // Delete search caches that might contain this hotel
        // Pattern: hotels:*
        await this.cacheRepo.deletePattern(`hotels:*`);

        logger.info(`✅ Cache invalidated for hotel ${hotelId}`);
    }

    /**
     * Publish Kafka event
     * Fails gracefully if Kafka unavailable
     */
    async publishEvent(topic, message) {
        if (!this.kafka) {
            return; // Kafka not configured
        }

        try {
            await this.kafka.send({
                topic,
                messages: [{
                    value: JSON.stringify(message),
                    timestamp: Date.now().toString()
                }]
            });
            logger.info(`✅ Event published: ${topic}`);
        } catch (error) {
            logger.error(`❌ Kafka publish error (${topic}): ${error.message}`);
            // Don't throw - fail gracefully
        }
    }
}

module.exports = HotelService;
