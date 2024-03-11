import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.database = database;
  }

  async isAlive() {
    try {
      await this.client.connect();
      return true;
    } catch (error) {
      return false;
    }
  }

  async nbUsers() {
    const db = this.client.db(this.database);
    const userCollection = db.collection('users');
    const userCount = await userCollection.countDocuments();
    return userCount;
  }

  async nbFiles() {
    const filesCollection = this.client.db(this.database).collection('files');
    const fileCount = await fileCollection.countDocuments();
    return filesCount;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
