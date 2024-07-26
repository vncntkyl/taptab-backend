const md5 = require("md5");
const multer = require("multer");
const { ObjectId } = require("mongodb");
const { differenceInMonths, format } = require("date-fns");

const connectDB = require("../db/conn.db");
const { bucket, sendResponse, getSignedUrl } = require("./controller.js");

const getFiles = async (
  filterOut = ["staticAds", "geoTaggedAds", "weatherAds"]
) => {
  let [files] = await bucket.getFiles();
  files = files.filter(
    (file) => !filterOut.some((prefix) => file.name.startsWith(prefix))
  );

  return files;
};

const retrieveMediaLibrary = async (_, res) => {
  try {
    //Database connection and data fetching
    const db = await connectDB();
    const collection = db.collection("media");
    const results = await collection.find({}).toArray();
    const items = [];
    const files = await getFiles();

    //Generating of media objects
    for (const file of files) {
      if (file.metadata.contentType === "text/plain") continue;
      const document = results.find((result) =>
        result._id.equals(file.metadata.metadata.dbID)
      );

      const signedUrl = await getSignedUrl(file.name);

      items.push({
        _id: document._id,
        fileName: file.name,
        category: document.category,
        name: document.name,
        contentType: file.metadata.contentType,
        size: file.metadata.size,
        bucket: file.metadata.bucket,
        timeCreated: file.metadata.timeCreated,
        signedUrl: signedUrl,
      });
    }

    // Merging of documents from mongoDB and files from GCP storage
    const library = results.map((result) => {
      const match = items.find(
        (item) => item._id == result._id && !item.fileName.includes("tmb")
      );
      if (match) {
        return { ...result, ...match };
      }
      return result; // If no match is found, use the result from MongoDB
    });
    items
      .filter(
        (item) =>
          !results.find(
            (result) => result._id == item._id && !item.fileName.includes("tmb")
          )
      )
      .forEach((unmatchedItem) => {
        library.push(unmatchedItem);
      });

    results
      .filter((result) => !items.find((item) => item._id == result._id))
      .forEach((unmatchedResult) => {
        if (!library.find((item) => item._id === unmatchedResult._id)) {
          library.push(unmatchedResult);
        }
      });

    sendResponse(res, library);
  } catch (error) {
    console.log("Error listing bucket contents: ", error);
    sendResponse(res, error.message, 500);
  }
};

const retrieveSingleMediaItem = async (req, res) => {
  try {
    //Initialize collections
    const { id } = req.params;
    const db = await connectDB();
    const mediaCollection = db.collection("media");
    const analyticsCollection = db.collection("analytics");

    //Fetch data from collection and bucket
    const media = await mediaCollection.findOne({ _id: new ObjectId(id) });
    const analytics = await analyticsCollection.findOne({
      media_id: new ObjectId(id),
    });
    const files = await getFiles();

    //Filter the bucket files with the ID of the requested media
    const mediaFiles = files.filter((file) => {
      // Check if dbID is defined before comparing
      if (file.metadata) {
        if (typeof file.metadata.metadata === "object") {
          return file.metadata.metadata.dbID === id;
        }
      }
      return false;
    });

    //Check if it returns results
    if (mediaFiles.length === 0) {
      return sendResponse(res, "Media not found", 400);
    }

    //Get only the media file
    const mediaItem = mediaFiles.find(
      (file) => !file.name.startsWith("thumbnail")
    );

    //Generate signed URL for the media file
    const signedUrl = await getSignedUrl(mediaItem.name);

    //Map the details for the final item object
    let item = {
      _id: media._id,
      category: media.category,
      name: media.name,
      type: media.type,
      duration: media.videoDuration,
      usage: media.usage,
      dimensions: {
        height: media.height,
        width: media.width,
      },
    };

    if (media.type === "link") {
      item = {
        ...item,
        _urlID: media.link,
        timeCreated: media.timeCreated,
        logs: { ...analytics },
      };
    } else {
      item = {
        ...item,
        contentType: mediaItem.metadata.contentType,
        size: mediaItem.metadata.size,
        bucket: mediaItem.metadata.bucket,
        timeCreated: mediaItem.metadata.timeCreated,
        signedUrl: signedUrl,
        logs: { ...analytics },
      };
    }

    sendResponse(res, item);
  } catch (error) {
    console.log("Error listing bucket contents: ", error);
    sendResponse(res, error.message, 500);
  }
};

const insertMediaItem = async (req, res) => {
  try {
    //Initialize the collection and bucket
    const { files } = req;
    const data = JSON.parse(req.body.mediaData);
    const db = await connectDB();
    const collection = db.collection("media");
    const result = await collection.insertOne(data);

    if (result.acknowledged) {
      if (data.type === "image") {
        if (!files || files.length === 0) {
          return sendResponse(res, "No files uploaded.", 400);
        }
        files.forEach(async (file) => {
          const fileUpload = bucket.file(file.originalname);
          const stream = fileUpload.createWriteStream({
            metadata: {
              contentType: file.mimetype,
              metadata: {
                dbID: result.insertedId,
              },
            },
          });
          stream.on("error", (error) => {
            console.error(`Error uploading ${file.originalname}:`, error);
            sendResponse(res, error.message, 400);
          });
          // Upload the file
          stream.end(file.buffer);
          await new Promise((resolve) => stream.on("finish", resolve));
        });
      } else if (data.type === "video" || data.type === "link") {
        if (!files || files.length === 0) {
          return sendResponse(res, "No files uploaded.", 400);
        }

        files.forEach(async (file) => {
          if (file.originalname.includes("tmb")) {
            file.originalname = "thumbnail/" + file.originalname;
          }
          const fileUpload = bucket.file(file.originalname);
          const stream = fileUpload.createWriteStream({
            metadata: {
              contentType: file.mimetype,
              metadata: {
                dbID: result.insertedId,
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
      }
      sendResponse(res, result);
    } else {
      sendResponse(res, "Error Upload", 400);
    }
  } catch (error) {
    console.log("Upload Error: ", error);
    sendResponse(res, error.message, 500);
  }
};

const updateMediaItem = async (req, res) => {
  try {
    const { files } = req;
    const { id } = req.params;
    const data = JSON.parse(req.body.mediaData);
    const db = await connectDB();
    const collection = db.collection("media");
    const updates = { ...data };
    delete updates.fileName;
    delete updates.thumbnail_src;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updates,
      }
    );

    if (result.acknowledged) {
      if (!files || files.length === 0) {
        return sendResponse(res, result);
      }

      files.forEach(async (file) => {
        if (file.originalname.includes("tmb")) {
          file.originalname = "thumbnail/" + file.originalname;

          const thumbnailFile = bucket.file(data.thumbnail_src);
          await thumbnailFile.save(file.originalname, {
            metadata: {
              contentType: file.mimetype,
              metadata: {
                dbID: id,
              },
            },
          });
        } else {
          const mediaFile = bucket.file(data.fileName);
          await mediaFile.save(file.originalname, {
            metadata: {
              contentType: file.mimetype,
              metadata: {
                dbID: id,
              },
            },
          });
        }
      });
    } else {
      sendResponse(res, "Database Error", 400);
    }
  } catch (error) {
    console.log("Update Error: ", error);
    sendResponse(res, error.message, 500);
  }
};

const updateMediaAnalytics = async (req, res) => {
  try {
  } catch (error) {
    console.log("Update Error: ", error);
    sendResponse(res, error.message, 500);
  }
};

const retrieveMediaAnalytics = async (_, res) => {
  try {
  } catch (error) {
    console.log(error);
    sendResponse(res, error.message, 500);
  }
};

const StorageController = {
  insertMediaItem,
  updateMediaItem,
  retrieveMediaLibrary,
  updateMediaAnalytics,
  retrieveMediaAnalytics,
  retrieveSingleMediaItem,
};

module.exports = StorageController;
