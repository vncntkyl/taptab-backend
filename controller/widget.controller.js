const fs = require("fs");
const { ObjectId } = require("mongodb");
const connectDB = require("../db/conn.db");
const { sendResponse } = require("./controller.js");

const filePath = "taptab.config.json";

const retrieveDashboardSummary = async (_, res) => {
  try {
    let size = [];
    const db = await connectDB();
    const collections = await db.collections();

    const cardOrder = [
      "media_library",
      "static_ads",
      "players",
      "user_engagements",
      "users",
    ];

    for (const collection of collections) {
      let key = collection.collectionName;
      const documents = await collection.countDocuments({
        status: { $not: { $eq: "deleted" } },
      });
      if (key === "media") {
        key = "media_library";
      }
      if (key === "staticAds") {
        key = "static_ads";
      }
      if (key === "surveyResponses") {
        key = "user_engagements";
      }

      if (
        ![
          "planner",
          "playlist",
          "engagements",
          "staticAnalytics",
          "analytics",
          "geoTaggedAds",
          "geoTaggedAnalytics",
          "weatherAds",
        ].includes(key)
      ) {
        size.push({ [key]: documents });
      }
    }

    size = size.sort(
      (a, b) =>
        cardOrder.indexOf(Object.keys(a)[0]) -
        cardOrder.indexOf(Object.keys(b)[0])
    );
    size = size.reduce((acc, curr) => {
      const key = Object.keys(curr)[0];
      const value = curr[key];
      acc[key] = value;
      return acc;
    }, {});

    sendResponse(res, size);
  } catch (error) {
    console.log("Retrieval Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const systemReset = async (_, res) => {
  try {
    const db = await connectDB();
    const collections = await db.listCollections().toArray();

    const collectionsToTruncate = collections
      .filter((collection) => collection.name !== "users")
      .map((collection) => collection.name);

    if (collectionsToTruncate.length === 0) {
      console.log("No collections to truncate (except users)");
      return sendResponse(res, "System has already been reset.", 400);
    }

    const promises = collectionsToTruncate.map((collectionName) =>
      db.collection(collectionName).deleteMany({})
    );

    Promise.all(promises)
      .then((results) => {
        results.forEach((result, index) => {
          console.log(
            `Truncated ${collectionsToTruncate[index]}: ${result.deletedCount} documents deleted`
          );
        });
        sendResponse(res, "System reset successfully");
      })
      .catch((error) => {
        console.error("Truncate Error: ", error.message);
        sendResponse(res, error.message, 500);
      });
  } catch (error) {
    console.log("Truncate Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const retrieveRecycleBin = async (_, res) => {
  try {
    const db = await connectDB();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((collection) => collection.name);

    const results = await Promise.all(
      collectionNames.map(async (collectionName) => {
        const documents = await db
          .collection(collectionName)
          .find({ status: "deleted" })
          .toArray();
        return { collectionName, documents };
      })
    );

    const bin = results.filter((result) => result.documents.length !== 0);

    sendResponse(res, bin);
  } catch (error) {
    console.log("Delete Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const emptyRecycleBin = async (_, res) => {
  try {
    const db = await connectDB();
    const collections = await db.listCollections().toArray();

    const collectionNames = collections.map((collection) => collection.name);
    const results = await Promise.all(
      collectionNames.map((collectionName) =>
        db.collection(collectionName).deleteMany({ status: "deleted" })
      )
    );
    sendResponse(res, results);
  } catch (error) {
    console.log("Delete Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const deleteSingleTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const { collectioName } = req.body;

    const db = await connectDB();
    const collection = await db.collection(collectioName);
    const response = await collection.deleteOne({ _id: new ObjectId(id) });

    sendResponse(response);
  } catch (error) {
    console.log("Delete Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const deleteMultipleTrash = async (req, res) => {
  try {
    const collections = req.body;

    const db = await connectDB();

    const results = await Promise.all(
      collections.map(async (collection) => {
        const dbCollection = db.collection(collection.name);
        const objectIdArray = collection.ids.map((id) => new ObjectId(id));
        const response = await dbCollection.deleteMany({
          _id: { $in: objectIdArray },
        });
        return response;
      })
    );

    sendResponse(res, results);
  } catch (error) {
    console.log("Delete Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};
const retrieveSettings = async (_, res) => {
  try {
    retrieveFile(async (err, jsonData) => {
      if (err) {
        sendResponse(res, err.message, 500);
        return;
      }
      const user = await retrieveUser(jsonData.updated_by);
      jsonData.updated_by = user;
      sendResponse(res, jsonData);
    });
  } catch (error) {
    console.log("Settings Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};
const updateSettings = async (req, res) => {
  try {
    const updatedjson = req.body;

    let settings = await new Promise((resolve, reject) => {
      retrieveFile((err, jsonData) => {
        if (err) {
          reject(err);
        } else {
          resolve(jsonData);
        }
      });
    });

    // Apply updates
    for (const [key, value] of Object.entries(updatedjson)) {
      settings = updateNested(settings, key, value);
    }

    const updatedConfig = settings;
    updateFile(updatedConfig, (err) => {
      if (err) {
        sendResponse(res, err.message, 500);
        return;
      }
    });

    const user = await retrieveUser(updatedConfig.updated_by);

    updatedConfig.updated_by = user;
    sendResponse(res, { ...updatedConfig, acknowledged: true });
  } catch (error) {
    console.log("Settings Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

//HELPER FUNCTIONS
const retrieveFile = (callback) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      callback(err, null);
      return;
    }
    const json = JSON.parse(data);
    callback(null, json);
  });
};
const updateFile = (updatedData, callback) => {
  const updatedJsonString = JSON.stringify(updatedData, null, 2);

  fs.writeFile(filePath, updatedJsonString, "utf8", (err) => {
    if (err) {
      console.error(err);
      callback(err);
      return;
    }
    console.log("JSON file has been updated!");
    callback(null);
  });
};
const updateNested = (obj, path, newValue) => {
  if (!path) return obj;

  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = newValue;

  return obj;
};

const retrieveUser = async (id) => {
  try {
    const db = await connectDB();
    const collection = db.collection("users");
    const _id = id;

    const query = {
      _id: new ObjectId(_id),
      status: { $not: { $eq: "deleted" } },
    };

    const user = await collection.findOne(query, {
      projection: {
        _id: 1,
        first_name: 1,
        last_name: 1,
      },
    });

    return user;
  } catch (error) {
    console.log("Retrieve Error", error.message);
  }
};

const WidgetController = {
  retrieveDashboardSummary,
  deleteMultipleTrash,
  retrieveRecycleBin,
  deleteSingleTrash,
  retrieveSettings,
  emptyRecycleBin,
  updateSettings,
  systemReset,
};

module.exports = WidgetController;
