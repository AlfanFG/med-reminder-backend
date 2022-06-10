const mongoose = require("mongoose");
module.exports = (app) => {
  const jobScheduler = require("../models/jobScheduler.model")(mongoose);
  const router = require("express").Router();

  router.get("/", (req, res) => {
    jobScheduler
      .find()
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
    const user_id = { user_id: mongoose.Types.ObjectId(req.body.user_id) };
    const data = Object.assign(req.body, user_id);

    jobScheduler
      .create(data)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        res.status(500).send({
          message: err.message || "Some Error While retrieving data",
        });
      });
  });

  app.use("/api/v1/jobScheduler", router);
};
