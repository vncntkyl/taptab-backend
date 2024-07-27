const express = require("express");
const PlayerController = require("../controller/player.controller");

const router = express();

router.get("/", PlayerController.retrievePlayers);

router.get("/ping/:id", PlayerController.updateStatus);

router.get("/:id", PlayerController.retrieveSinglePlayer); // from taptab/:id

router.post("/", PlayerController.createPlayer);

router.post("/login", PlayerController.loginDevice);

router.patch("/:id", PlayerController.updatePlayer);

router.delete("/:id", PlayerController.deletePlayer);

router.post("/log/:id", PlayerController.updateLocation);

const PlayerRoute = router;

module.exports = PlayerRoute;
