const express = require("express");
const WidgetController = require("../controller/widget.controller");

const router = express();

router.get("/s", WidgetController.retrieveSettings);

router.get("/ds", WidgetController.retrieveDashboardSummary);

router.get("/rb", WidgetController.retrieveRecycleBin);

router.patch("/s", WidgetController.updateSettings);

router.delete("/rb", WidgetController.emptyRecycleBin);

router.delete("/rb/s/:id", WidgetController.deleteSingleTrash);

router.delete("/rb/m", WidgetController.deleteMultipleTrash);

router.delete("/sys", WidgetController.systemReset);

const WidgetRoute = router;

module.exports = WidgetRoute;
