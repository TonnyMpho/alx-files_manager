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
    try {
      await this.client.connect();
      const db = this.client.db(this.database);
      const userCollection = db.collection('users');
      const userCount = await userCollection.countDocuments();
      return userCount;
    } catch (error) {
      console.log(error)
    }
  }

  async nbFiles() {
    try {
      await this.client.connect();
      const filesCollection = this.client.db(this.database).collection('files');
      const fileCount = await filesCollection.countDocuments();
      return filesCount;
    } catch (error) {
      console.log(error)
    }
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
