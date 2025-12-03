/**
 * CarService
 * 
 * Business logic for car rentals with caching and validation
 */

const Joi = require('joi');
const logger = require('../utils/logger');

class CarService {
    constructor(carRepo, cacheRepo, kafkaProducer = null) {
        this.carRepo = carRepo;
        this.cacheRepo = cacheRepo;
        this.kafka = kafkaProducer;
        this.cacheEnabled = process.env.ENABLE_CACHE !== 'false';
        this.kafkaEnabled = process.env.ENABLE_KAFKA !== 'false';
        logger.info(`🎛️  Feature Flags: Cache=${this.cacheEnabled}, Kafka=${this.kafkaEnabled}`);
    }

    async searchCars(filters) {
        const validated = this.validateSearchFilters(filters);
        const cacheKey = this.generateCacheKey(validated);

        const cached = this.cacheEnabled ? await this.cacheRepo.get(cacheKey) : null;
        if (cached) {
            logger.info(`✅ Cache HIT: ${cacheKey}`);
            return JSON.parse(cached);
        }

        logger.info(`❌ Cache MISS: ${cacheKey}`);

        const cars = await this.carRepo.searchCars(validated);
        const processed = this.processCars(cars, validated);

        if (this.cacheEnabled) {
            await this.cacheRepo.set(cacheKey, JSON.stringify(processed), 900);
        }

        if (this.kafkaEnabled) {
            await this.publishEvent('car.searched', {
                filters: validated,
                resultsCount: cars.length,
                timestamp: new Date().toISOString()
            });
        }

        return processed;
    }

    async getCarById(carId) {
        const cacheKey = `car:${carId}`;

        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const car = await this.carRepo.findById(carId);

        if (!car) {
            throw new Error('Car not found');
        }

        await this.cacheRepo.set(cacheKey, JSON.stringify(car), 3600);

        return car;
    }

    async reserveCar(carId, pickupDate, returnDate) {
        const result = await this.carRepo.reserveCar(carId, pickupDate, returnDate);

        await this.invalidateCarCache(carId);

        await this.publishEvent('car.reserved', {
            carId,
            pickupDate,
            returnDate,
            timestamp: new Date().toISOString()
        });

        return result;
    }

    async releaseCar(carId) {
        const result = await this.carRepo.releaseCar(carId);

        await this.invalidateCarCache(carId);

        await this.publishEvent('car.released', {
            carId,
            timestamp: new Date().toISOString()
        });

        return result;
    }

    async searchLocations(query) {
        if (!query || query.length < 2) {
            return [];
        }

        const cacheKey = `locations:search:${query.toLowerCase()}`;

        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const locations = await this.carRepo.searchLocations(query);

        await this.cacheRepo.set(cacheKey, JSON.stringify(locations), 3600);

        return locations;
    }

    validateSearchFilters(filters) {
        const schema = Joi.object({
            location: Joi.string().min(2).required(),
            pickupDate: Joi.date().iso().min('now').required(),
            returnDate: Joi.date().iso().greater(Joi.ref('pickupDate')).required(),
            carType: Joi.string().valid('economy', 'compact', 'suv', 'luxury', 'any').default('any')
        });

        const { error, value } = schema.validate(filters);

        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
        }

        return value;
    }

    generateCacheKey(filters) {
        const { location, pickupDate, returnDate, carType } = filters;
        const pickupStr = typeof pickupDate === 'string' ? pickupDate : pickupDate.toISOString().split('T')[0];
        const returnStr = typeof returnDate === 'string' ? returnDate : returnDate.toISOString().split('T')[0];
        const cleanLocation = location.toLowerCase().replace(/\s+/g, '-');
        return `cars:${cleanLocation}:${pickupStr}:${returnStr}:${carType}`;
    }

    processCars(cars, filters) {
        return cars.map(car => {
            const pricePerDay = parseFloat(car.daily_rental_price || car.price_per_day) || 0;
            const rentalDays = car.rental_days || 1;
            const totalPrice = pricePerDay * rentalDays;

            return {
                ...car,
                price_per_day: pricePerDay.toFixed(2),
                total_price: totalPrice.toFixed(2),
                rental_days: rentalDays,
                available: car.is_available
            };
        });
    }

    async invalidateCarCache(carId) {
        await this.cacheRepo.delete(`car:${carId}`);
        await this.cacheRepo.deletePattern(`cars:*`);
        logger.info(`✅ Cache invalidated for car ${carId}`);
    }

    async publishEvent(topic, message) {
        if (!this.kafka) return;

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
        }
    }
}

module.exports = CarService;
