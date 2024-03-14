const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

async function getUserIdFromToken(token) {
  const userId = await redisClient.get(`auth_${token}`);
  return userId;
}

try {
  fs.mkdirSync(FOLDER_PATH, { recursive: true });
} catch (error) {
  console.error('Error creating directory:', error);
}

const FilesController = {
  async postUpload(req, res) {
    const { 'x-token': token } = req.headers;
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    // Check if required fields are provided
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type or invalid type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    try {
      // Retrieve user based on token
      const userId = await getUserIdFromToken(token);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // If parentId is set, validate it
      if (parentId !== 0) {
        const parentFile = await dbClient.files.findOne({ _id: ObjectId(parentId) });
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      let localPath;
      if (type !== 'folder') {
        // Store file locally
        const fileData = Buffer.from(data, 'base64');
        const filename = uuidv4();
        localPath = path.join(FOLDER_PATH, filename);
        fs.writeFileSync(localPath, fileData);
      }

      // Create new file document
      const newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId,
        localPath: localPath || null,
      };

      // Insert new file document into the database
      const result = await dbClient.files.insertOne(newFile);
      newFile.id = result.insertedId;

      return res.status(201).json(newFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  async getShow(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    try {
      // Retrieve user based on token
      const userId = await getUserIdFromToken(token);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find file document by ID and user ID
      const file = await dbClient.files.findOne({ _id: id, userId });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(file);
    } catch (error) {
      console.error('Error retrieving file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getIndex(req, res) {
    const { 'x-token': token } = req.headers;
    const { parentId = 0, page = 0 } = req.query;

    try {
      // Retrieve user based on token
      const userId = await getUserIdFromToken(token);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Perform pagination and retrieve files for the specified parentId
      const files = await dbClient.files
        .find({ userId, parentId })
        .skip(parseInt(page, 10) * 20)
        .limit(20)
        .toArray();

      return res.json(files);
    } catch (error) {
      console.error('Error retrieving files:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

module.exports = FilesController;
