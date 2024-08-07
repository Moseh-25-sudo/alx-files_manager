import redisClient from '../utils/redis.js';

describe('Redis Client', () => {
    beforeAll(async () => {
        await redisClient.connect();
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    test('should set and get a value', async () => {
        await redisClient.set('testKey', 'testValue');
        const value = await redisClient.get('testKey');
        expect(value).toBe('testValue');
    });

    test('should return null for non-existent key', async () => {
        const value = await redisClient.get('nonExistentKey');
        expect(value).toBeNull();
    });
});
