const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  projectId: "taptab-418401",
  keyFilename: "taptab-418401-a7f87dfe0929.json",
});

const bucket = storage.bucket("tap_ads");

const sendResponse = (res, content, status = 200) => {
  res.status(status).send(content);
};

const getSignedUrl = async (fileName) => {
  const options = {
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
  };
  const [signedUrl] = await bucket.file(fileName).getSignedUrl(options);

  return signedUrl;
};

const Controller = {
  storage,
  bucket,
  sendResponse,
  getSignedUrl,
};

module.exports = Controller;
