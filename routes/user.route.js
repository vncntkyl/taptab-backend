// import express from "express";
// import { UserController } from "../controller/user.controller";
const express = require("express");
const UserController = require("../controller/user.controller");

const router = express.Router();

router.get("/", UserController.retrieveUsers);

router.post("/login", UserController.loginUser);

router.post("/register", UserController.registerUser);

router.patch("/:id", UserController.updateUser);

router.patch("/manage/:id", UserController.updateUserStatus);

const UserRoute = router;

module.exports = UserRoute;
