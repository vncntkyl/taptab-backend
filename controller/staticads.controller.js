const { ObjectId } = require("mongodb");

const connectDB = require("../db/conn.db");
const { sendResponse, bucket, getSignedUrl } = require("./controller.js");

const retrieveStaticAds = async (_, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("staticAds");
    const results = await collection
      .aggregate([
        {
          $match: {
            status: {
              $not: {
                $eq: "deleted",
              },
            },
          },
        },
        {
          $lookup: {
            from: "staticAnalytics",
            localField: "_id",
            foreignField: "_id",
            as: "views",
          },
        },
        {
          $unwind: {
            path: "$views",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            "views._id": 0,
          },
        },
      ])
      .toArray();

    let [files] = await bucket.getFiles();
    const items = [];

    files = files.filter((file) => file.name.startsWith("staticAds"));

    for (const file of files) {
      if (file.metadata.contentType === "text/plain") return;
      const signedUrl = await getSignedUrl(file.name);
      items.push({
        _id: file.metadata.metadata.dbID,
        type: file.metadata.metadata.type,
        name: file.name,
        timeCreated: file.metadata.timeCreated,
        timeUpdated: file.metadata.updated,
        signedUrl: signedUrl,
      });
    }

    const library = results.map((result) => {
      const match = items.filter((item) => item._id == result._id);
      if (match) {
        return {
          ...result,
          timeCreated: match[0].timeCreated,
          timeUpdated: match[0].timeUpdated,
          images: [
            ...match.map((file) => ({
              fileName: file.name,
              signedUrl: file.signedUrl,
              type: file.type,
            })),
          ],
        };
      }
      return result;
    });

    sendResponse(res, library);
  } catch (error) {
    console.log("Retrieve Static Ads Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const retrieveSingleStaticAd = async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("staticAds");
    const results = await collection
      .aggregate([
        {
          $match: {
            status: {
              $not: {
                $eq: "deleted",
              },
            },
            _id: new ObjectId(req.params.id),
          },
        },
        {
          $lookup: {
            from: "staticAnalytics",
            localField: "_id",
            foreignField: "_id",
            as: "views",
          },
        },
        {
          $unwind: {
            path: "$views",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            "views._id": 0,
          },
        },
      ])
      .toArray();

    let [files] = await bucket.getFiles();
    const items = [];

    files = files.filter((file) => {
      const isStaticAds = file.name.startsWith("staticAds");

      const hasID = file.metadata.metadata
        ? file.metadata.metadata.dbID === req.params.id
        : null;

      return isStaticAds && hasID;
    });

    for (const file of files) {
      if (file.metadata.contentType === "text/plain") return;

      const signedUrl = await getSignedUrl(file.name);

      items.push({
        _id: file.metadata.metadata.dbID,
        type: file.metadata.metadata.type,
        timeCreated: file.metadata.timeCreated,
        timeUpdated: file.metadata.updated,
        signedUrl: signedUrl,
      });
    }

    const [library] = results.map((result) => {
      const match = items.filter((item) => item._id == result._id);
      if (match) {
        return {
          ...result,
          timeCreated: match[0].timeCreated,
          timeUpdated: match[0].timeUpdated,
          images: [
            ...match.map((item) => ({
              signedUrl: item.signedUrl,
              type: item.type,
            })),
          ],
        };
      }
      return result;
    });
    sendResponse(res, library);
  } catch (error) {
    console.log("Retrieve Single Static Ad Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const retrieveStaticAdsAnalytics = async (_, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("staticAnalytics");

    const currentDate = new Date();
    const startDate = new Date(
      new Date().setDate(currentDate.getDate() - 28)
    ).toISOString();

    console.log(startDate, currentDate.toISOString());
    const response = await collection
      .find({
        "logs.date": {
          $gte: startDate,
          $lte: currentDate.toISOString(),
        },
      })
      .toArray();

    let analytics = [];

    if (response) {
      response.forEach(({ logs }) => {
        analytics.push(...logs);
      });
    }
    let information = [
      {
        name: "Impressions",
        value: 0,
      },
      {
        name: "Engagements",
        value: 0,
      },
    ];
    for (const entry of analytics) {
      if (entry.action === "viewed") {
        information[0].value += 1;
      }
      if (entry.action === "scanned") {
        information[1].value += 1;
      }
    }
    sendResponse(res, information);
  } catch (error) {
    console.log("Retrieve Analytics Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const createStaticAd = async (req, res) => {
  try {
    const files = req.files;
    const data = JSON.parse(req.body.adData);
    const db = await connectDB();
    const collection = db.collection("staticAds");

    if (!files || files.length !== 2) {
      return sendResponse(res, "Missing files", 400);
    }

    const result = await collection.insertOne(data);

    files.forEach(async (file, index) => {
      file.originalname = "staticAds/" + file.originalname;

      const fileUpload = bucket.file(file.originalname);
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            dbID: result.insertedId,
            type: index === 0 ? "main" : "thumbnail",
          },
        },
      });
      stream.on("error", (error) => {
        res.status(400).send(error);
        console.error(`Error uploading ${file.originalname}:`, error);
      });
      // Upload the file
      stream.end(file.buffer);
      await new Promise((resolve) => stream.on("finish", resolve));
    });

    res.status(200).send(result);
  } catch (error) {
    console.log("Create Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const updateStaticAd = async (req, res) => {
  try {
    const adData = JSON.parse(req.body.adData);
    const { id } = req.params;
    const files = req.files;
    const db = await connectDB();
    const collection = db.collection("staticAds");

    const query = { _id: new ObjectId(id) };
    const updates = {
      $set: {
        name: adData.name,
        description: adData.description,
        category: adData.category,
        link: adData.link,
      },
    };
    const result = await collection.updateOne(query, updates);

    if (!files || files.length === 0) {
      return sendResponse(res, { ...result, modified: "partial" });
    }

    for (const file of files) {
      if (file) {
        let fileData;
        if (adData.image === "changed") {
          fileData = adData.images.find((img) => img.type === "main");
        }
        if (adData.imageThumbnail === "changed") {
          fileData = adData.images.find((img) => img.type === "thumbnail");
        }

        if (!fileData) continue;
        const bucketFile = bucket.file(fileData.fileName);

        await bucketFile.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              dbID: id,
              type: fileData.type,
            },
          },
        });
      }
    }

    sendResponse(res, {
      acknowledged: true,
      modified: "full",
    });
  } catch (error) {
    console.log("Update Error: ", error);
    sendResponse(res, error.message, 500);
  }
};

const deleteStaticAd = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectDB();
    const collection = db.collection("staticAds");
    const query = { _id: new ObjectId(id) };

    const updates = {
      $set: {
        status: "deleted",
      },
    };
    const response = await collection.updateOne(query, updates);

    sendResponse(res, response);
  } catch (error) {
    console.log("Update Error: ", error);
    sendResponse(res, error.message, 500);
  }
};

const recordQRScan = async (req, res) => {
  try {
    const db = await connectDB();
    let collection = db.collection("staticAds");
    if (req.params.id !== null) {
      collection = db.collection("staticAnalytics");
      const log = {
        action: "scanned",
        date: new Date().toISOString(),
      };
      const query = { _id: new ObjectId(req.params.id) };
      const response = await collection.updateOne(query, {
        $push: { logs: log },
      });

      if (response?.acknowledged) {
        collection = db.collection("staticAds");
        const ad = await collection.findOne({
          _id: new ObjectId(req.params.id),
        });

        sendResponse(res, ad);
      }
    }
  } catch (error) {
    console.log("Record Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};

const recordImpressions = async (req, res) => {
  try {
    const db = await connectDB();
    const newLog = req.body;
    const id = req.params.id;
    const collection = db.collection("staticAnalytics");

    const result = await collection.findOne({ _id: new ObjectId(id) });

    let response;
    if (!result) {
      const log = {
        _id: new ObjectId(id),
        logs: [newLog],
      };
      response = await collection.insertOne(log);
    } else {
      const query = { _id: new ObjectId(id) };
      const updates = {
        $push: { logs: newLog }, // Directly pushing newLog to the array
      };
      response = await collection.updateOne(query, updates);
    }

    sendResponse(res, response);
  } catch (error) {
    console.log("Retrieval Error: ", error.message);
    sendResponse(res, error.message, 500);
  }
};
const StaticAdController = {
  retrieveStaticAds,
  retrieveSingleStaticAd,
  createStaticAd,
  updateStaticAd,
  deleteStaticAd,
  retrieveStaticAdsAnalytics,
  recordQRScan,
  recordImpressions,
};

module.exports = StaticAdController;
