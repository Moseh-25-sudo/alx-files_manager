import Bull from 'bull';
import fs from 'fs';
import path from 'path';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db.js';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
    const { fileId, userId } = job.data;

    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId });

    if (!file) throw new Error('File not found');

    const sizes = [100, 250, 500];
    for (const size of sizes) {
        const thumbnail = await imageThumbnail(file.localPath, { width: size });
        const thumbnailPath = `${file.localPath}_${size}`;
        fs.writeFileSync(thumbnailPath, thumbnail);
    }
});

// Start the worker
fileQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

fileQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed: ${err.message}`);
});
