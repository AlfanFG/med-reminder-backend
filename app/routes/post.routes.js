const mongoose = require("mongoose");
var CronJob = require("cron").CronJob;
module.exports = (app) => {
  const Post = require("../models/post.model")(mongoose);
  const router = require("express").Router();

  router.get("/", (req, res) => {
    Post.find()
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        res.status(500).send({
          message: err.message || "Some Error While retrieving data",
        });
      });
  });

  router.post("/", (req, res) => {
    const data = req.body;
    console.log(data);
    Post.create(data)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        res.status(500).send({
          message: err.message || "Some Error While retrieving data",
        });
      });
  });

  app.use("/api/v1/posts", router);
};
