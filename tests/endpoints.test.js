import request from 'supertest';
import app from '../app.js'; // Adjust the import based on your app's entry point

describe('API Endpoints', () => {
    let token;

    beforeAll(async () => {
        const response = await request(app)
            .get('/connect')
            .set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=');
        token = response.body.token;
    });

    test('GET /status should return status', async () => {
        const response = await request(app).get('/status');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
    });

    test('GET /stats should return stats', async () => {
        const response = await request(app).get('/stats');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('stats');
    });

    test('POST /users should create a user', async () => {
        const response = await request(app)
            .post('/users')
            .send({ name: 'New User', email: 'newuser@example.com' });
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
    });

    test('GET /connect should return a token', async () => {
        const response = await request(app)
            .get('/connect')
            .set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
    });

    test('GET /disconnect should return success', async () => {
        const response = await request(app).get('/disconnect').set('X-Token', token);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'disconnected');
    });

    test('GET /users/me should return user info', async () => {
        const response = await request(app).get('/users/me').set('X-Token', token);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('email');
    });

    test('POST /files should upload a file', async () => {
        const response = await request(app)
            .post('/files')
            .set('X-Token', token)
            .attach('file', 'path/to/test/image.png'); // Adjust the path to your test file
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
    });

    test('GET /files/:id should return a file', async () => {
        const response = await request(app)
            .get('/files/testFileId') // Replace with a valid test file ID
            .set('X-Token', token);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('name');
    });

    test('GET /files should return a paginated list of files', async () => {
        const response = await request(app).get('/files?page=1&limit=10');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('files');
        expect(Array.isArray(response.body.files)).toBe(true);
    });

    test('PUT /files/:id/publish should publish a file', async () => {
        const response = await request(app)
            .put('/files/testFileId/publish') // Replace with a valid test file ID
            .set('X-Token', token);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('isPublic', true);
    });

    test('PUT /files/:id/unpublish should unpublish a file', async () => {
        const response = await request(app)
            .put('/files/testFileId/unpublish') // Replace with a valid test file ID
            .set('X-Token', token);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('isPublic', false);
    });

    test('GET /files/:id/data should return file content', async () => {
        const response = await request(app)
            .get('/files/testFileId/data') // Replace with a valid test file ID
            .set('X-Token', token);
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
    });
});
