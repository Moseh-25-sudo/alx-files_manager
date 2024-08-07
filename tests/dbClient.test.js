import dbClient from '../utils/db.js';

describe('DB Client', () => {
    beforeAll(async () => {
        await dbClient.connect();
    });

    afterAll(async () => {
        await dbClient.close();
    });

    test('should retrieve a collection', async () => {
        const collection = dbClient.db.collection('users');
        expect(collection).toBeDefined();
    });

    test('should insert and find a document', async () => {
        const usersCollection = dbClient.db.collection('users');
        const user = { name: 'Test User', email: 'test@example.com' };
        const { insertedId } = await usersCollection.insertOne(user);

        const foundUser = await usersCollection.findOne({ _id: insertedId });
        expect(foundUser).toEqual(expect.objectContaining(user));
    });
});
