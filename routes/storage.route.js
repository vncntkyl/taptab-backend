const multer = require("multer");
const express = require("express");

const StorageController = require("../controller/storage.controller");

const router = express();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", StorageController.retrieveMediaLibrary);

router.get("/analytics", StorageController.retrieveMediaAnalytics);

router.get("/:id", StorageController.retrieveSingleMediaItem);

router.post("/", upload.array("files", 5), StorageController.insertMediaItem);

router.put("/:id", upload.array("files", 5), StorageController.updateMediaItem);

router.delete("/:id", StorageController.deleteMediaItem);

router.patch("/analytics/:id", StorageController.updateMediaAnalytics);

const StorageRoute = router;

module.exports = StorageRoute;
