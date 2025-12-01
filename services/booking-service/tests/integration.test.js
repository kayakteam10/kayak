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

describe('Booking Service Integration Tests', () => {
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

    describe('POST /bookings', () => {
        it('should create a booking', async () => {
            const res = await request(app).post('/bookings')
                .send({
                    user_id: 44,
                    booking_type: 'flight',
                    booking_details: { flight_id: 1, seats: ['12A'] },
                    total_amount: 300.00,
                    payment_method: 'credit_card'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.bookingId).toBeDefined();
        });

        it('should return 400 for missing fields', async () => {
            const res = await request(app).post('/bookings').send({});
            expect(res.statusCode).toEqual(400);
        });
    });
});
