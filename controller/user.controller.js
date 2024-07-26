const connectDB = require("../db/conn.db");
const md5 = require("md5");
const { ObjectId } = require("mongodb");
const { sendResponse } = require("./controller.js");

const retrieveUsers = async (_, res) => {
  try {
    const db = await connectDB();
    let collection = db.collection("users");
    let query = {
      status: { $not: { $eq: "deleted" } },
    };
    let results = await collection
      .find(query)
      .project({
        password: 0,
      })
      .toArray();
    sendResponse(res, results);
  } catch (error) {
    console.error(error);
    sendResponse(res, error.message, 500);
  }
};

const registerUser = async (req, res) => {
  try {
    const { body: loginData } = req;
    const db = await connectDB();
    const collection = db.collection("users");

    const first_name = loginData.first_name
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toLowerCase();
    const last_name = loginData.last_name.replace(/\s+/g, "").toLowerCase();

    const username = `${first_name}${last_name}`;
    const password = md5(username);

    const newUser = {
      ...loginData,
      username,
      password,
      middle_name: loginData.middle_name || "",
      status: "active",
    };

    const isExistingUser = await collection.findOne({ username: username });

    if (isExistingUser) {
      return sendResponse(res, "User is already registered", 404);
    }

    const result = await collection.insertOne(newUser);
    sendResponse(res, result);
  } catch (error) {
    console.error(error);
    sendResponse(res, error.message, 500);
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await connectDB();
    const collection = db.collection("users");
    const user = await collection.findOne({
      username: username.toLowerCase(),
      password: md5(password),
    });

    if (!user) {
      return sendResponse(res, "Incorrect username or password", 404);
    }

    if (user.status === "deleted") {
      return sendResponse(
        res,
        "Sorry, your account has been terminated. Please contact your administrator for account recovery.",
        404
      );
    }

    if (user.status === "inactive") {
      return sendResponse(
        res,
        "Sorry, your account has been deactivated. Please contact your administrator for account reactivation.",
        404
      );
    }

    sendResponse(res, user);
  } catch (error) {
    console.error(error);
    sendResponse(res, error.message, 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const { body: userData } = req;
    const db = await connectDB();
    const collection = db.collection("users");
    const query = { _id: new ObjectId(req.params.id) };

    const updates = {
      $set: {
        ...userData,
      },
    };

    const result = await collection.updateOne(query, updates);

    sendResponse(res, result);
  } catch (error) {
    console.error(error);
    sendResponse(res, error.message, 500);
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const db = await connectDB();
    const { status } = req.body;
    const collection = db.collection("users");
    const query = { _id: new ObjectId(req.params.id) };
    const update = {
      $set: {
        status: status,
      },
    };
    const result = await collection.updateOne(query, update);
    sendResponse(res, result);
  } catch (error) {
    console.log(error);
    sendResponse(res, error.message, 500);
  }
};

const UserController = {
  retrieveUsers,
  registerUser,
  loginUser,
  updateUser,
  updateUserStatus,
};

module.exports = UserController;
