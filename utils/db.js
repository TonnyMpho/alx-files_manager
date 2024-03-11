const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    this.client = new MongoClient(`mongodb://${host}:${port}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

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
      const usersCollection = this.client.db(this.database).collection('users');
      const count = await usersCollection.countDocuments();
      return count;
    } catch (error) {
      console.log(error);
      return 0;
    }
  }

  async nbFiles() {
    try {
      const filesCollection = this.client.db(this.database).collection('files');
      const count = await filesCollection.countDocuments();
      return count;
    } catch (error) {
      console.log(error);
      return 0;
    }
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
