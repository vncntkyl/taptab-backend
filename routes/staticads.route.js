const multer = require("multer");
const express = require("express");

const StaticAdController = require("../controller/staticads.controller");

const router = express();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", StaticAdController.retrieveStaticAds);

router.get("/analytics", StaticAdController.retrieveStaticAdsAnalytics);

router.get("/analytics/:id", StaticAdController.recordQRScan);

router.put("/analytics/:id", StaticAdController.recordImpressions);

router.get("/:id", StaticAdController.retrieveSingleStaticAd);

router.post("/", upload.array("files", 2), StaticAdController.createStaticAd);

router.patch(
  "/:id",
  upload.array("files", 2),
  StaticAdController.updateStaticAd
);

router.delete("/:id", StaticAdController.deleteStaticAd);

const StaticAdRoute = router;

module.exports = StaticAdRoute;
