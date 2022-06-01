const mongoose = require("mongoose");
var CronJob = require("cron").CronJob;
module.exports = (app) => {
  const User = require("../models/user.model")(mongoose);
  const router = require("express").Router();

  router.get("/", (req, res) => {
    User.find()
      .then((result) => {
        console.log(result);
        res.send(result);
      })
      .catch((err) => {
        res.status(500).send({
          message: err.message || "Some Error While retrieving data",
        });
      });
  });

  app.use("/api/v1/user", router);
};
