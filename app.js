const express = require("express");
const { text, json } = require("express");
const numCPUs = require("os").cpus().length;
const cors = require("cors");
const bodyParser = require("body-parser");
const UserRoute = require("./routes/user.route");
const StorageRoute = require("./routes/storage.route");
const PlaylistRoute = require("./routes/playlist.route");
const PlannerRoute = require("./routes/planner.route");
const PlayerRoute = require("./routes/player.route");

const app = express();

const port = process.env.PORT || 5051;

app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(text());
app.use(json());

//test route
app.get("/", (_, res) => {
  res.send("I'm working! 😊");
});

//api routes
app.use("/users", UserRoute);
app.use("/storage", StorageRoute);
app.use("/playlist", PlaylistRoute);
app.use("/planner", PlannerRoute);
app.use("/players", PlayerRoute);

app.listen(port, () => {
  console.log(
    `Server is running at http://localhost:${port} with ${numCPUs} cpus`
  );
});
