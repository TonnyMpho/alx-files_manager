const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });

    this.usersCollection = null;
    this.filesCollection = null;
  }

  async connect() {
    try {
      await this.client.connect();
      const db = this.client.db();
      this.usersCollection = db.collection('users');
      this.filesCollection = db.collection('files');
    } catch (error) {
      console.error(error);
    }
  }

  async isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    try {
      const count = await this.usersCollection.countDocuments();
      return count;
    } catch (error) {
      console.error(error);
      return -1;
    }
  }

  async nbFiles() {
    try {
      const count = await this.filesCollection.countDocuments();
      return count;
    } catch (error) {
      console.error(error);
      return -1;
    }
  }
}

const dbClient = new DBClient();
dbClient.connect();
module.exports = dbClient;
