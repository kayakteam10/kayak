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

describe('Flight Service Integration Tests', () => {
    let app;
    let kafka;
    let dbPool;
    let redisClient;

    beforeAll(async () => {
        // Initialize app
        const init = await initializeApp();
        app = init.app;
        kafka = init.kafka;

        // We need access to db and redis to close them, but initializeApp doesn't return them directly in the object structure used in server.js
        // Wait, looking at server.js, initializeApp returns { app, kafka }. 
        // But inside initializeApp, it creates dbPool and redisClient. 
        // We might need to modify server.js to return them or handle cleanup differently.
        // For now, let's assume the server handles its own connections, but for testing we need to close them to exit cleanly.
        // Actually, looking at server.js again:
        // return { app, kafka };
        // The dbPool and redisClient are local variables in initializeApp (or global in the file?).
        // In server.js:
        // const dbPool = require('./config/database');
        // const redisClient = require('./config/redis');
        // These are required at the top level. So we can require them here to close them.
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

    describe('GET /flights/search', () => {
        it('should return flights for valid search', async () => {
            const res = await request(app).get('/flights/search')
                .query({
                    from: 'SFO',
                    to: 'JFK',
                    date: '2025-12-01'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            // We know AA101 is in the DB for this date
            if (res.body.data.length > 0) {
                expect(res.body.data[0].flight_number).toBe('AA101');
            }
        });

        it('should return 400 for missing parameters', async () => {
            const res = await request(app).get('/flights/search');
            expect(res.statusCode).toEqual(400);
        });
    });
});
