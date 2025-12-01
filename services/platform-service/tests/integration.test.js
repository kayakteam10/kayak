const request = require('supertest');
const { app, dbPool } = require('../src/server');

describe('Platform Service Integration Tests', () => {
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

    describe('POST /auth/register', () => {
        it('should register a new user', async () => {
            const email = `test-${Date.now()}@example.com`;
            const res = await request(app).post('/auth/register')
                .send({
                    email,
                    password: 'password123',
                    first_name: 'Test',
                    last_name: 'User'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
        });

        it('should return 400 for missing fields', async () => {
            const res = await request(app).post('/auth/register').send({});
            expect(res.statusCode).toEqual(400);
        });
    });
});
