const { ObjectId } = require("mongodb");

const connectDB = require("../db/conn.db");
const { sendResponse } = require("./controller.js");

const retrieveSchedules = async (_, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("planner");
    let query = {
      status: { $not: { $eq: "deleted" } },
    };

    const results = await collection
      .aggregate([
        {
          $lookup: {
            from: "playlist",
            localField: "playlist_id",
            foreignField: "_id",
            as: "playlist",
          },
        },
        {
          $unwind: {
            path: "$playlist",
          },
        },
        {
          $project: {
            _id: 1,
            start: 1,
            end: 1,
            backgroundColor: 1,
            status: 1,
            playlist_id: 1,
            occurence: 1,
            playlist_media: "$playlist.media_items",
          },
        },
        {
          $match: query,
        },
      ])
      .toArray();

    let schedules = [];

    results.forEach((result) => {
      schedules = schedules.concat(generateSchedule(result));
    });
    sendResponse(res, schedules);
  } catch (error) {
    console.log("Retrieval Error: ", error);
    sendResponse(res, error.message, 500);
  }
};

const retrieveSingleSchedule = async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("planner");
    const { id } = req.params;
    let query = {
      _id: new ObjectId(id),
      status: { $not: { $eq: "deleted" } },
    };

    const response = await collection
      .aggregate([
        {
          $lookup: {
            from: "playlist",
            localField: "playlist_id",
            foreignField: "_id",
            as: "playlist",
          },
        },
        {
          $unwind: {
            path: "$playlist",
          },
        },
        {
          $project: {
            _id: 1,
            start: 1,
            end: 1,
            backgroundColor: 1,
            status: 1,
            playlist_id: 1,
            occurence: 1,
            // playlist_media: "$playlist.media_items",
          },
        },
        {
          $match: query,
        },
      ])
      .toArray();

    if (response.length === 0) sendResponse(res, "No results found", 400);

    sendResponse(res, response[0]);
  } catch (error) {
    console.log("Retrieval Error: ", error);
    sendResponse(res, error.message, 500);
  }
};

const createSchedule = async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("planner");
    const schedule = req.body;

    const newSchedule = {
      ...schedule,
      playlist_id: new ObjectId(schedule.playlist_id),
      status: "active",
    };

    const response = await collection.insertOne(newSchedule);

    if (response.acknowledged) {
      const collection = db.collection("playlist");
      const updates = {
        $inc: {
          usage: 1,
        },
      };
      const response = await collection.updateOne(
        { _id: new ObjectId(schedule.playlist_id) },
        updates
      );
      sendResponse(res, response);
    }
  } catch (error) {
    console.log("Creation Error: ", error);
    sendResponse(res, error.message, 500);
  }
};

const generateSchedule = (item) => {
  const start_date = new Date(item.start);
  const end_date = new Date(item.end);
  let schedule = [];

  if (item.occurence.repeat === "everyday") {
    let current_date = new Date(start_date);
    while (current_date <= end_date) {
      const start_time = new Date(item.occurence.timeslot.start);
      const end_time = new Date(item.occurence.timeslot.end);
      schedule.push({
        id: item._id,
        start: new Date(
          current_date.getFullYear(),
          current_date.getMonth(),
          current_date.getDate(),
          start_time.getHours(),
          start_time.getMinutes()
        ),
        end: new Date(
          current_date.getFullYear(),
          current_date.getMonth(),
          current_date.getDate(),
          end_time.getHours(),
          end_time.getMinutes()
        ),
        playlist_id: item.playlist_id,
        playlist_media: item.playlist_media,
        backgroundColor: item.backgroundColor,
      });
      current_date.setDate(current_date.getDate() + 1);
    }
  } else if (item.occurence.repeat === "custom") {
    item.occurence.timeslot.forEach((timeslot) => {
      const day = timeslot.day.toLowerCase();
      let current_date = new Date(start_date);
      while (current_date <= end_date) {
        if (
          current_date
            .toLocaleDateString("en-US", { weekday: "long" })
            .toLowerCase() === day
        ) {
          const start_time = new Date(timeslot.start);
          const end_time = new Date(timeslot.end);
          schedule.push({
            id: item._id,
            start: new Date(
              current_date.getFullYear(),
              current_date.getMonth(),
              current_date.getDate(),
              start_time.getHours(),
              start_time.getMinutes()
            ),
            end: new Date(
              current_date.getFullYear(),
              current_date.getMonth(),
              current_date.getDate(),
              end_time.getHours(),
              end_time.getMinutes()
            ),
            playlist_id: item.playlist_id,
            playlist_media: item.playlist_media,
            backgroundColor: item.backgroundColor,
          });
        }
        current_date.setDate(current_date.getDate() + 1);
      }
    });
  }
  return schedule;
};

const PlannerController = {
  retrieveSchedules,
  retrieveSingleSchedule,
  createSchedule,
};

module.exports = PlannerController;
