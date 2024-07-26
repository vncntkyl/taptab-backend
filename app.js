// import express, { text, json } from "express";
// import cors from "cors";
// import bodyParser from "body-parser";
// import { UserRoute } from "./src/routes/user.route"
// import * as https from "https";
const express = require("express");
const { text, json } = require("express");
const numCPUs = require("os").cpus().length;
const cors = require("cors");
const bodyParser = require("body-parser");
const UserRoute = require("./routes/user.route");

const app = express();

const port = process.env.PORT || 5051;

app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(text());
app.use(json());

//routes
app.get("/", (_, res) => { res.send("I'm working! 😊"); });
//users
app.use("/users", UserRoute);

app.listen(port, () => {
  console.log(
    `Server is running at http://localhost:${port} with ${numCPUs} cpus`
  );
});
