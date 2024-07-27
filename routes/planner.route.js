const express = require("express");
const PlannerController = require("../controller/planner.controller");

const router = express();

router.get("/", PlannerController.retrieveSchedules);

router.get("/:id", PlannerController.retrieveSingleSchedule);

router.post("/", PlannerController.createSchedule);

const PlannerRoute = router;

module.exports = PlannerRoute;
