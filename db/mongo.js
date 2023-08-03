const MongoClient = require("mongodb").MongoClient;

const connectionString = process.env.MONGODB_URL || "";

const client = new MongoClient(connectionString);

const dbHolder = {
  db: null,
};

async function init() {
  try {
    const conn = await client.connect();
    const db = conn.db("dosPrograms");
    dbHolder.db = db;
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

init();

module.exports = dbHolder;
