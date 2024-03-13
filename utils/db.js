const { MongoClient } = require('mongodb');

class DBClient {
    constructor() {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';

        this.client = new MongoClient(`mongodb://${host}:${port}`, {
            useUnifiedTopology: true,
        });

        this.client.connect((err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    async isAlive() {
        try {
            await this.client.connect();
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    async nbUsers() {
        try {
            const usersCollection = this.client.db().collection('users');
            const count = await usersCollection.countDocuments();
            return count;
        } catch (error) {
            return 0;
        }
    }

    async nbFiles() {
        try {
            const filesCollection = this.client.db().collection('files');
            const count = await filesCollection.countDocuments();
            return count;
        } catch (error) {
            return 0;
        }
    }
}

const dbClient = new DBClient();
module.exports = dbClient;
