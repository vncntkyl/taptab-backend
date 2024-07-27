const { ObjectId } = require("mongodb");
const { format } = require("date-fns");

const connectDB = require("../db/conn.db");
const { sendResponse } = require("./controller.js");

const retrievePlaylists = async (_, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("playlist");
    const results = await collection
      .find({ status: { $not: { $eq: "deleted" } } })
      .toArray();

    sendResponse(res, results);
  } catch (error) {
    console.log("Retrieval error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const retrievePlaylistNames = async (_, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("playlist");
    const results = await collection
      .find({})
      .project({ _id: 1, playlist_name: 1, category: 1 })
      .toArray();

    res.send(results).status(200);
  } catch (error) {
    console.log("Retrieval error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const createPlaylist = async (req, res) => {
  try {
    const db = await connectDB();
    const newPlaylist = {
      ...req.body,
      usage: 0,
      time_created: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
      status: "active",
    };
    let collection = db.collection("playlist");

    const { media_items } = newPlaylist;

    let result = await collection.insertOne(newPlaylist);
    if (result.acknowledged) {
      const IDs = media_items.map((id) => new ObjectId(id));
      collection = db.collection("media");
      const query = { _id: { $in: IDs }, status: { $not: { $eq: "deleted" } } };
      const updates = {
        $inc: {
          usage: 1,
        },
      };
      result = await collection.updateMany(query, updates);
      sendResponse(res, result);
    }
  } catch (error) {
    console.log("Insert error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    const db = await connectDB();
    const collection = db.collection("playlist");

    const query = { _id: new ObjectId(id) };
    const updates = {
      $set: {
        ...body,
      },
    };
    const results = await collection.updateOne(query, updates);

    sendResponse(res, results);
  } catch (error) {
    console.log("Update error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectDB();
    const playlist = db.collection("playlist");
    const planner = db.collection("planner");

    const query = { _id: new ObjectId(id) };
    const update = {
      $set: {
        status: "deleted",
      },
    };
    const response = await playlist.updateOne(query, update);
    if (response.acknowledged) {
      const response = await planner.updateMany(
        {
          playlist_id: new ObjectId(id),
        },
        update
      );
      sendResponse(res, response);
    }
  } catch (error) {
    console.log("Delete error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const PlaylistController = {
  retrievePlaylists,
  retrievePlaylistNames,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
};

module.exports = PlaylistController;
