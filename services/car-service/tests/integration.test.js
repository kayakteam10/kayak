const request = require('supertest');

// Mock Kafka to avoid connection issues and "request is not a function" errors
jest.mock('kafkajs', () => {
    return {
        Kafka: jest.fn().mockImplementation(() => ({
            producer: jest.fn().mockReturnValue({
                connect: jest.fn().mockResolvedValue(),
                disconnect: jest.fn().mockResolvedValue(),
                send: jest.fn().mockResolvedValue()
            })
        }))
    };
});

const { initializeApp } = require('../src/server');

describe('Car Service Integration Tests', () => {
    let app;
    let kafka;

    beforeAll(async () => {
        const init = await initializeApp();
        app = init.app;
        kafka = init.kafka;
    });

    afterAll(async () => {
        const dbPool = require('../src/config/database');
        const redisClient = require('../src/config/redis');

        await dbPool.end();
        await redisClient.quit();
        if (kafka) {
            await kafka.disconnect();
        }
    });

    describe('GET /health', () => {
        it('should return 200 OK', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('healthy');
        });
    });

    describe('GET /cars/search', () => {
        it('should return cars for valid search', async () => {
            const res = await request(app).get('/cars/search')
                .query({
                    location: 'San Francisco',
                    pickupDate: '2025-12-25',
                    returnDate: '2025-12-30'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            if (res.body.data.length > 0) {
                expect(res.body.data[0].location_city).toBe('San Francisco');
            }
        });

        it('should return 400 for missing parameters', async () => {
            const res = await request(app).get('/cars/search');
            expect(res.statusCode).toEqual(400);
        });
    });
});
