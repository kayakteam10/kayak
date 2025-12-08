/**
 * FlightService
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only business logic for flights
 * - Open/Closed: Extensible for new flight types without modification
 * - Dependency Inversion: Depends on repository interfaces
 * 
 * Business Rules:
 * - Cache flight searches for 15 minutes
 * - Validate all inputs before database queries
 * - Publish Kafka events for analytics
 * - Invalidate cache on availability changes
 */

const Joi = require('joi');
const logger = require('../utils/logger');

class FlightService {
    constructor(flightRepo, cacheRepo, kafkaProducer = null) {
        this.flightRepo = flightRepo;
        this.cacheRepo = cacheRepo;
        this.kafka = kafkaProducer;
        this.cacheEnabled = process.env.ENABLE_CACHE !== 'false';
        this.kafkaEnabled = process.env.ENABLE_KAFKA !== 'false';
        logger.info(`🎛️  Feature Flags: Cache=${this.cacheEnabled}, Kafka=${this.kafkaEnabled}`);
    }

    /**
     * Search flights with caching
     * Pattern: Read-Through Cache
     * 
     * @param {Object} filters
     * @returns {Promise<Array>}
     */
    async searchFlights(filters) {
        // 1. Validate filters
        const validated = this.validateSearchFilters(filters);

        // 2. Handle roundtrip searches
        if (validated.tripType === 'roundtrip' && validated.returnDate) {
            return await this.searchRoundtrip(validated);
        }

        // 3. Generate cache key
        const cacheKey = this.generateCacheKey(validated);

        // 4. Check cache (Read-Through Caching) - if enabled
        if (this.cacheEnabled) {
            const cached = await this.cacheRepo.get(cacheKey);
            if (cached) {
                logger.info(`✅ Cache HIT: ${cacheKey}`);
                return JSON.parse(cached);
            }
        }

        logger.info(`❌ Cache MISS: ${cacheKey}`);

        // 5. Query database
        const flights = await this.flightRepo.searchFlights(validated);

        // 6. Apply business rules & processing
        const processed = this.processFlights(flights, validated);

        // 7. Cache results (Write-Through Caching) - if enabled
        if (this.cacheEnabled) {
            await this.cacheRepo.set(
                cacheKey,
                JSON.stringify(processed),
                900  // 15 min TTL
            );
        }

        // 8. Publish Kafka event (Fire-and-forget) - if enabled
        if (this.kafkaEnabled) {
            await this.publishEvent('flight.searched', {
                filters: validated,
                resultsCount: flights.length,
                timestamp: new Date().toISOString()
            });
        }

        return processed;
    }

    /**
     * Search roundtrip flights
     * Queries both outbound and return flights
     */
    async searchRoundtrip(filters) {
        logger.info(`🔄 Roundtrip search: ${filters.origin} → ${filters.destination} → ${filters.origin}`);

        // Search outbound flights
        const outboundFilters = {
            origin: filters.origin,
            destination: filters.destination,
            date: filters.date,
            passengers: filters.passengers,
            tripType: 'oneway'
        };
        const outboundFlights = await this.flightRepo.searchFlights(outboundFilters);

        // Search return flights (swap origin and destination)
        const returnFilters = {
            origin: filters.destination,
            destination: filters.origin,
            date: filters.returnDate,
            passengers: filters.passengers,
            tripType: 'oneway'
        };
        const returnFlights = await this.flightRepo.searchFlights(returnFilters);

        logger.info(`✈️ Found ${outboundFlights.length} outbound, ${returnFlights.length} return flights`);

        return {
            outbound: this.processFlights(outboundFlights, outboundFilters),
            return: this.processFlights(returnFlights, returnFilters),
            tripType: 'roundtrip'
        };
    }

    /**
     * Get flight details by ID with caching
     * 
     * @param {number} flightId
     * @returns {Promise<Object>}
     */
    async getFlightById(flightId) {
        const cacheKey = `flight:${flightId}`;

        // Check cache
        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query database
        const flight = await this.flightRepo.findById(flightId);

        if (!flight) {
            throw new Error('Flight not found');
        }

        // Cache result
        await this.cacheRepo.set(cacheKey, JSON.stringify(flight), 3600); // 1 hour

        return flight;
    }

    /**
     * Get available seats for a flight
     * 
     * @param {number} flightId
     * @returns {Promise<Array>}
     */
    async getFlightSeats(flightId) {
        const cacheKey = `flight:${flightId}:seats`;

        // Check cache
        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query database
        const seats = await this.flightRepo.getSeats(flightId);

        // Group by seat type for frontend
        const processed = this.groupSeatsByType(seats);

        // Cache (shorter TTL due to availability changes)
        await this.cacheRepo.set(cacheKey, JSON.stringify(processed), 300); // 5 min

        return processed;
    }

    /**
     * Reserve seats (temporary hold)
     * Transaction with cache invalidation
     * 
     * @param {number} flightId
     * @param {Array<string>} seatNumbers
     * @returns {Promise<Object>}
     */
    async reserveSeats(flightId, seatNumbers) {
        // 1. Validate inputs
        if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
            throw new Error('Invalid seat numbers');
        }

        // 2. Business rule: Max 9 seats per booking
        if (seatNumbers.length > 9) {
            throw new Error('Maximum 9 seats allowed per booking');
        }

        // 3. Reserve seats (database transaction)
        const result = await this.flightRepo.reserveSeats(flightId, seatNumbers);

        // 4. Invalidate cache (cache-aside pattern)
        await this.invalidateFlightCache(flightId);

        // 5. Publish Kafka event
        await this.publishEvent('flight.seats.reserved', {
            flightId,
            seatNumbers,
            count: seatNumbers.length,
            timestamp: new Date().toISOString()
        });

        return result;
    }

    /**
     * Release seats (for cancellations)
     * Called by Kafka consumer
     * 
     * @param {number} flightId
     * @param {Array<string>} seatNumbers
     * @returns {Promise<Object>}
     */
    async releaseSeats(flightId, seatNumbers) {
        // Release seats (database transaction)
        const result = await this.flightRepo.releaseSeats(flightId, seatNumbers);

        // Invalidate cache
        await this.invalidateFlightCache(flightId);

        // Publish event
        await this.publishEvent('flight.seats.released', {
            flightId,
            seatNumbers,
            count: seatNumbers.length,
            timestamp: new Date().toISOString()
        });

        return result;
    }

    /**
     * Update flight availability (from booking confirmation)
     * Called by Kafka consumer
     * 
     * @param {number} flightId
     * @param {number} seatsBooked
     * @returns {Promise<Object>}
     */
    async updateAvailability(flightId, seatsBooked) {
        const result = await this.flightRepo.updateAvailability(flightId, seatsBooked);

        // Invalidate cache
        await this.invalidateFlightCache(flightId);

        return result;
    }

    /**
     * Handle booking cancellation event (Rollback)
     * Called by Kafka consumer
     * 
     * @param {Object} event - Cancellation event payload
     */
    async handleBookingCancellation(event) {
        try {
            const { booking_type, booking_details } = event;

            // Only handle flight bookings
            if (booking_type !== 'flight' && booking_type !== 'flights') {
                return;
            }

            if (!booking_details) {
                logger.warn('⚠️ No booking details found in cancellation event');
                return;
            }

            // Extract Flight IDs (could be single or multiple for round-trips)
            // Strategy: Look for specific flight IDs or array of legs
            const primaryFlightId = booking_details.flight_id;

            // Extract Seats
            let seatsToRelease = [];

            // Case 1: 'selected_seats' is array of strings: ['1A', '1B']
            if (Array.isArray(booking_details.selected_seats)) {
                // Check if elements are strings or objects
                if (booking_details.selected_seats.length > 0) {
                    const sample = booking_details.selected_seats[0];
                    if (typeof sample === 'string') {
                        seatsToRelease = booking_details.selected_seats;
                    } else if (typeof sample === 'object' && sample.seatNumber) {
                        // Case 2: Array of objects [{seatNumber: '1A'}, ...]
                        seatsToRelease = booking_details.selected_seats.map(s => s.seatNumber);
                    }
                }
            }
            // Case 3: 'seats' object in passengers (older format)
            else if (Array.isArray(booking_details.passengers)) {
                const extracted = new Set();
                booking_details.passengers.forEach(p => {
                    if (p.seatNumber) extracted.add(p.seatNumber);
                    if (p.seats && typeof p.seats === 'object') {
                        Object.values(p.seats).forEach(s => extracted.add(s));
                    }
                });
                seatsToRelease = Array.from(extracted);
            }

            if (!primaryFlightId || seatsToRelease.length === 0) {
                logger.warn(`⚠️ Could not parse flight/seats for rollback. FlightID: ${primaryFlightId}, Seats: ${seatsToRelease.length}`);
                return;
            }

            logger.info(`Checking rollback for Flight ${primaryFlightId}, Seats: ${seatsToRelease.join(', ')}`);

            // RELEASE SEATS
            await this.releaseSeats(primaryFlightId, seatsToRelease);
            logger.info(`✅ Rolled back ${seatsToRelease.length} seats for Flight ${primaryFlightId}`);

        } catch (error) {
            logger.error(`❌ Error handling cancellation: ${error.message}`);
        }
    }

    /**
     * Search airports (autocomplete)
     * 
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async searchAirports(query) {
        if (!query || query.length < 2) {
            return [];
        }

        const cacheKey = `airports:search:${query.toLowerCase()}`;

        // Check cache
        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query database
        const airports = await this.flightRepo.searchAirports(query);

        // Format for autocomplete
        const formatted = airports.map(a => ({
            code: a.code,
            label: `${a.code} - ${a.name}, ${a.city}`,
            city: a.city,
            name: a.name
        }));

        // Cache (1 hour - airports don't change often)
        await this.cacheRepo.set(cacheKey, JSON.stringify(formatted), 3600);

        return formatted;
    }

    // ========== Private Helper Methods ==========

    /**
     * Validate search filters
     * Uses Joi for validation
     */
    validateSearchFilters(filters) {
        const schema = Joi.object({
            origin: Joi.string().length(3).uppercase().required(),
            destination: Joi.string().length(3).uppercase().required(),
            date: Joi.date().iso().required(),
            returnDate: Joi.date().iso().min(Joi.ref('date')).optional(),
            passengers: Joi.number().integer().min(1).max(9).default(1),
            tripType: Joi.string().valid('oneway', 'roundtrip', 'multicity').default('oneway')
        });

        const { error, value } = schema.validate(filters);

        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
        }

        return value;
    }

    /**
     * Generate cache key for flight search
     * Pattern: flights:{origin}:{destination}:{date}:{passengers}
     */
    generateCacheKey(filters) {
        const { origin, destination, date, passengers } = filters;
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return `flights:${origin}:${destination}:${dateStr}:${passengers}`;
    }

    /**
     * Process flights - add calculated fields
     * Business logic: Calculate total price with fees
     */
    processFlights(flights, filters) {
        return flights.map(flight => {
            // Calculate total price per passenger
            const basePrice = parseFloat(flight.price);
            const carryOnFee = parseFloat(flight.carry_on_fee) || 0;
            const checkedBagFee = parseFloat(flight.checked_bag_fee) || 0;

            // Default: 1 checked bag per passenger
            const totalPrice = (basePrice + checkedBagFee) * filters.passengers;

            return {
                ...flight,
                duration_formatted: this.formatDuration(flight.duration),
                total_price: totalPrice.toFixed(2),
                price_per_passenger: basePrice.toFixed(2),
                available: flight.available_seats >= filters.passengers
            };
        });
    }

    /**
     * Format duration (minutes to hours:minutes)
     */
    formatDuration(minutes) {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    /**
     * Group seats by type for frontend display
     */
    groupSeatsByType(seats) {
        const grouped = {
            economy: [],
            business: [],
            first: [],
            premium: []
        };

        seats.forEach(seat => {
            const type = seat.seat_type || 'economy';
            if (grouped[type]) {
                grouped[type].push(seat);
            }
        });

        return {
            total: seats.length,
            available: seats.filter(s => s.is_available).length,
            seatsByType: grouped,
            allSeats: seats
        };
    }

    /**
     * Invalidate all cache related to a flight
     * Cache-aside pattern
     */
    async invalidateFlightCache(flightId) {
        // Delete specific flight cache
        await this.cacheRepo.delete(`flight:${flightId}`);
        await this.cacheRepo.delete(`flight:${flightId}:seats`);

        // Delete search caches that might contain this flight
        // Pattern: flights:*
        await this.cacheRepo.deletePattern(`flights:*`);

        logger.info(`✅ Cache invalidated for flight ${flightId}`);
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

module.exports = FlightService;
