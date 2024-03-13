const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    this.client = new MongoClient(`mongodb://${host}:${port}`, {
      useUnifiedTopology: true,
    });

    this.connected = false;
    this.client.connect((err) => {
      if (err) {
        console.log(err);
        this.connected = false;
      } else {
        this.connected = true;
      }
    });
    this.database = database;
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    const usersCollection = this.client.db(this.database).collection('users');
    const count = await usersCollection.countDocuments();
    return count;
  }

  async nbFiles() {
    const filesCollection = this.client.db(this.database).collection('files');
    const count = await filesCollection.countDocuments();
    return count;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
