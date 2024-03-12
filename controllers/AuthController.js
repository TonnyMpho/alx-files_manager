const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');
const sha1 = require('sha1');

const AuthController = {
  async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    try {
      const user = await dbClient.usersCollection.findOne({ email, password: sha1(password) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const key = `auth_${token}`;
      await redisClient.set(key, user._id.toString(), 86400); // 24 hours expiration

      return res.status(200).json({ token });
    } catch (error) {
      console.error('Error connecting user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    try {
      const userId = await redisClient.get(key);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await redisClient.del(key);
      return res.status(204).end();
    } catch (error) {
      console.error('Error disconnecting user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = AuthController;
