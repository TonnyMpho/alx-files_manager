import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import mime from 'mime-types';
import Queue from 'bull';
// import imageThumbnail from 'image-thumbnail';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fileQueue = new Queue('fileQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});

class FilesController {
  static async getUser(request) {
    const token = request.header('X-Token');
    if (!token) return null;
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return null;
    const idObject = new ObjectID(userId);
    const user = await dbClient.users.findOne({ _id: idObject });
    return user;
  }

  static async postUpload(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name, type, parentId, isPublic, data,
    } = request.body;
    if (!name || !type) {
      return response.status(400).json({ error: 'Missing name or type' });
    }
    if (parentId) {
      const idObject = new ObjectID(parentId);
      const file = await dbClient.files.findOne({ _id: idObject, userId: user._id });
      if (!file) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      try {
        const result = dbClient.files.insertOne({
          userId: user._id,
          name,
          type,
          parentId: parentId || 0,
          isPublic: isPublic || false,
        });
        return response.status(201).json({
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic: isPublic || false,
          parentId: parentId || 0,
        });
      } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Internal server error' });
      }
    } else {
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const fileName = `${filePath}/${uuidv4()}`;
      const buff = Buffer.from(data, 'base64');
      try {
        await fs.mkdir(filePath, { recursive: true });
        await fs.writeFile(fileName, buff, 'utf-8');
        const result = await dbClient.files.insertOne({
          userId: user._id,
          name,
          type,
          isPublic: isPublic || false,
          parentId: parentId || 0,
          localPath: fileName,
        });
        if (type === 'image') {
          fileQueue.add({ userId: user._id, fileId: result.insertedId });
        }
        return response.status(201).json({
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic: isPublic || false,
          parentId: parentId || 0,
        });
      } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async getShow(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = request.params.id;
    const idObject = new ObjectID(fileId);
    const file = await dbClient.files.findOne({ _id: idObject, userId: user._id });
    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }
    return response.status(200).json(file);
  }

  static async getIndex(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId, page } = request.query;
    const pageNum = page ? parseInt(page, 10) : 0;

    const query = { userId: user._id };
    if (parentId) {
      query.parentId = ObjectID(parentId);
    }

    try {
      const totalFilesCount = dbClient.files.countDocuments(query);
      const pageSize = 20;
      const totalPages = Math.ceil(totalFilesCount / pageSize);

      const cursor = dbClient.files.find(query).skip(pageNum * pageSize).limit(pageSize);
      const filesArray = await cursor.toArray();

      const filesFormatted = filesArray.map((file) => {
        const { _id, ...formattedFile } = file;
        return { id: _id, ...formattedFile };
      });

      return response.status(200).json({
        total: totalFilesCount,
        totalPages,
        currentPage: pageNum,
        files: filesFormatted,
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFile(request, response) {
    const { id } = request.params;
    const { size } = request.query;
    const fileId = new ObjectID(id);
    const file = await dbClient.files.findOne({ _id: fileId });
    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }
    if (!file.isPublic && (!request.user || request.user._id !== file.userId.toString())) {
      return response.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return response.status(400).json({ error: "A folder doesn't have content" });
    }
    try {
      let filePath = file.localPath;
      if (size) {
        filePath = `${file.localPath}_${size}`;
      }
      const fileContent = await fs.readFile(filePath);
      const contentType = mime.lookup(file.name);
      response.setHeader('Content-Type', contentType);
      return response.send(fileContent);
    } catch (error) {
      console.error(error);
      return response.status(404).json({ error: 'Not found' });
    }
  }

  static async putPublish(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = request.params;
    const idObject = new ObjectID(id);

    try {
      const updatedFile = await dbClient.files.findOneAndUpdate(
        { _id: idObject, userId: user._id },
        { $set: { isPublic: true } },
        { returnOriginal: false },
      );

      if (!updatedFile.value) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.status(200).json(updatedFile.value);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal server error' });
    }
  }

  static async putUnpublish(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = request.params;
    const idObject = new ObjectID(id);

    try {
      const updatedFile = await dbClient.files.findOneAndUpdate(
        { _id: idObject, userId: user._id },
        { $set: { isPublic: false } },
        { returnOriginal: false },
      );

      if (!updatedFile.value) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.status(200).json(updatedFile.value);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = FilesController;
