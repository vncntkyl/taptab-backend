const express = require("express");
const PlaylistController = require("../controller/playlist.controller");

const router = express();

router.get("/", PlaylistController.retrievePlaylists);

router.get("/names", PlaylistController.retrievePlaylistNames);

router.post("/", PlaylistController.createPlaylist);

router.patch("/:id", PlaylistController.updatePlaylist);

router.delete("/:id", PlaylistController.deletePlaylist);

const PlaylistRoute = router;

module.exports = PlaylistRoute;
