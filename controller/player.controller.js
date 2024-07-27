const { ObjectId, ReturnDocument } = require("mongodb");

const connectDB = require("../db/conn.db");
const { sendResponse } = require("./controller.js");

let query = {
  status: { $not: { $eq: "deleted" } },
};
const retrievePlayers = async (_, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("players");

    const response = await collection.find(query).toArray();
    sendResponse(res, response);
  } catch (error) {
    console.log("Retrieval Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const retrieveSinglePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectDB();
    const collection = db.collection("players");
    const response = await collection.findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          isOnline: 0,
        },
      }
    );
    sendResponse(res, response);
  } catch (error) {
    console.log("Retrieval Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const createPlayer = async (req, res) => {
  try {
    const data = req.body;
    const db = await connectDB();
    const collection = db.collection("players");

    const response = await collection.insertOne(data);
    sendResponse(res, response);
  } catch (error) {
    console.log("Create Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const updatePlayer = async (req, res) => {
  try {
    const data = req.body;
    const { id } = req.params;
    const db = await connectDB();
    const collection = db.collection("players");

    delete data._id;

    const updates = {
      $set: { ...data },
    };

    const response = await collection.updateOne(
      { _id: new ObjectId(id) },
      updates
    );

    sendResponse(res, response);
  } catch (error) {
    console.log("Update Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const loginDevice = async (req, res) => {
  try {
    const data = req.body;
    const db = await connectDB();
    const collection = db.collection("players");

    const response = await collection.findOneAndUpdate(
      {
        access_code: data.key,
        status: "ready",
      },
      {
        $set: {
          status: "connected",
          isOnline: [
            new Date().toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
            }),
          ],
          deviceIP: data.ip,
        },
      },
      { returnDocument: "after", upsert: false }
    );
    sendResponse(res, response);
  } catch (error) {
    console.log("Login Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectDB();
    const collection = db.collection("players");

    const query = { _id: new ObjectId(id) };

    const updates = {
      $set: {
        status: "deleted",
      },
    };

    const response = await collection.updateOne(query, updates);

    sendResponse(res, response);
  } catch (error) {
    console.log("Delete Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const db = await connectDB();
    const collection = db.collection("players");

    delete data._id;
    const query = { _id: new ObjectId(id) };
    const updates = {
      $push: {
        last_location: {
          long: data.long,
          lat: data.lat,
          timestamp: new Date().toISOString(),
        },
      },
    };

    const response = await collection.updateOne(query, updates);
    sendResponse(res, response);
  } catch (error) {
    console.log("Create Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectDB();
    const collection = db.collection("players");

    const response = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          isOnline: new Date().toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          }),
        },
      }
    );
    sendResponse(res, response);
  } catch (error) {
    console.log("Update Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const PlayerController = {
  retrievePlayers,
  retrieveSinglePlayer,
  createPlayer,
  updatePlayer,
  loginDevice,
  updateLocation,
  updateStatus,
  deletePlayer,
};

module.exports = PlayerController;
