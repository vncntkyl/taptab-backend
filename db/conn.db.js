// import { MongoClient } from "mongodb";
const { MongoClient } = require("mongodb");

const connectionString =
  "mongodb+srv://kylerinoza:tqh0vgJbTUs1TBma@cluster-0.2fhszl4.mongodb.net/?retryWrites=true&w=majority&ssl=true";
const client = new MongoClient(connectionString);

let db;
async function connectDB() {
  if (db) return db;

  try {
    await client.connect();
    db = client.db("TaptabDB");
    console.log("connected to MongoDB");
    return db;
  } catch (e) {
    console.log(e);
    throw e;
  }
}
module.exports = connectDB;