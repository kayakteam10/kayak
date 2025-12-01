const request = require('supertest');

// Mock Kafka
jest.mock('kafkajs', () => {
    return {
        Kafka: jest.fn().mockImplementation(() => ({
            producer: jest.fn().mockReturnValue({
                connect: jest.fn().mockResolvedValue(),
                disconnect: jest.fn().mockResolvedValue(),
                send: jest.fn().mockResolvedValue()
            }),
            consumer: jest.fn().mockReturnValue({
                connect: jest.fn().mockResolvedValue(),
                subscribe: jest.fn().mockResolvedValue(),
                run: jest.fn().mockResolvedValue(),
                disconnect: jest.fn().mockResolvedValue()
            })
        }))
    };
});

const { app, initializeApp, dbPool } = require('../src/server');

describe('Payment Service Integration Tests', () => {
    beforeAll(async () => {
        await initializeApp();
    });

    afterAll(async () => {
        await dbPool.end();
    });

    describe('GET /health', () => {
        it('should return 200 OK', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('healthy');
        });
    });

    describe('GET /billing/user/:userId', () => {
        it('should return billing history', async () => {
            const res = await request(app).get('/billing/user/44');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
});
