const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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

  router.get("/:email", (req, res) => {
    const email = req.params.email;
    User.findOne({ email: email })
      .then((data) => {
        res.send({ code: 200, data: data });
      })
      .catch((err) => {
        res.send({ code: 404, message: "Not Found!" });
      });
  });

  router.post("/create", (req, res) => {
    const saltRounds = 10;
    // const account = {
    //   name: req.body.name,
    //   phone_number: req.body.phone_number,
    //   email: req.body.email,
    //   password: req.body.password,
    // };
    const pass = req.body.password;
    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(pass, salt, function (err, hash) {
        let pwd = { password: hash };
        let account = Object.assign(req.body, pwd);

        User.create(account)
          .then((result) => {
            res.send({ code: 200, result });
          })
          .catch((err) => {
            res.status(500).send({
              message: err.message || "Some Error While retrieving data",
            });
          });
      });
    });
  });

  app.use("/api/v1/user", router);
};
