const Queue = require('bull');
const imageThumbnail = require('image-thumbnail');
const { ObjectId } = require('mongodb');
const fs = require('fs');

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  // Validate job data
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  for (const size of sizes) {
    const thumbnailPath = `/tmp/files_manager/${fileId}_${size}.jpg`;
    await generateThumbnail(file.localPath, thumbnailPath, size);
  }
});

async function generateThumbnail(inputPath, outputPath, size) {
  const thumbnail = await imageThumbnail(inputPath, { width: size, responseType: 'buffer' });
  fs.writeFileSync(outputPath, thumbnail);
}

module.exports = { fileQueue };
