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
    this.users = this.client.db(database).collection('users');
    this.files = this.client.db(database).collection('files');
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    const count = await this.users.countDocuments();
    return count;
  }

  async nbFiles() {
    const count = await this.files.countDocuments();
    return count;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
