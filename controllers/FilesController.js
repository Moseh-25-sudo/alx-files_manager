import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class FilesController {
    static async postUpload(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const key = `auth_${token}`;
        const userId = await redisClient.get(key);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, type, parentId = 0, isPublic = false, data } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Missing name' });
        }

        if (!type || !['folder', 'file', 'image'].includes(type)) {
            return res.status(400).json({ error: 'Missing type' });
        }

        if (type !== 'folder' && !data) {
            return res.status(400).json({ error: 'Missing data' });
        }

        const filesCollection = dbClient.db.collection('files');
        
        if (parentId !== 0) {
            const parentFile = await filesCollection.findOne({ _id: new ObjectId(parentId) });
            if (!parentFile) {
                return res.status(400).json({ error: 'Parent not found' });
            }

            if (parentFile.type !== 'folder') {
                return res.status(400).json({ error: 'Parent is not a folder' });
            }
        }

        const fileData = {
            userId: new ObjectId(userId),
            name,
            type,
            isPublic,
            parentId: parentId !== 0 ? new ObjectId(parentId) : parentId,
        };

        if (type === 'folder') {
            const result = await filesCollection.insertOne(fileData);
            return res.status(201).json({
                id: result.insertedId,
                userId,
                name,
                type,
                isPublic,
                parentId
            });
        }

        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const localPath = path.join(folderPath, uuidv4());
        fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

        fileData.localPath = localPath;
        const result = await filesCollection.insertOne(fileData);

        return res.status(201).json({
            id: result.insertedId,
            userId,
            name,
            type,
            isPublic,
            parentId,
            localPath
        });
    }

    static async putPublish(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const key = `auth_${token}`;
        const userId = await redisClient.get(key);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const fileId = req.params.id;
        const filesCollection = dbClient.db.collection('files');
        const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        await filesCollection.updateOne({ _id: new ObjectId(fileId) }, { $set: { isPublic: true } });

        return res.status(200).json({
            id: file._id,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: true,
            parentId: file.parentId,
            localPath: file.localPath
        });
    }

    static async putUnpublish(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const key = `auth_${token}`;
        const userId = await redisClient.get(key);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const fileId = req.params.id;
        const filesCollection = dbClient.db.collection('files');
        const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        await filesCollection.updateOne({ _id: new ObjectId(fileId) }, { $set: { isPublic: false } });

        return res.status(200).json({
            id: file._id,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: false,
            parentId: file.parentId,
            localPath: file.localPath
        });
    }

    static async getFile(req, res) {
        const token = req.headers['x-token'];
        const fileId = req.params.id;
        const filesCollection = dbClient.db.collection('files');

        const file = await filesCollection.findOne({ _id: new ObjectId(fileId) });

        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (!file.isPublic) {
            if (!token) {
                return res.status(404).json({ error: 'Not found' });
            }

            const key = `auth_${token}`;
            const userId = await redisClient.get(key);

            if (!userId || file.userId.toString() !== userId) {
                return res.status(404).json({ error: 'Not found' });
            }
        }

        if (file.type === 'folder') {
            return res.status(400).json({ error: "A folder doesn't have content" });
        }

        if (!fs.existsSync(file.localPath)) {
            return res.status(404).json({ error: 'Not found' });
        }

        const mimeType = mime.lookup(file.name) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        const fileContent = fs.readFileSync(file.localPath);
        return res.status(200).send(fileContent);
    }
}

export default FilesController;
