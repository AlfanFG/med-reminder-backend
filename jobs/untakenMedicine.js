require("dotenv").config();
const mongoose = require("mongoose");
const { workerData } = require("worker_threads");
const { parentPort } = require("worker_threads");
const jobScheduler = require("../app/models/jobScheduler.model")(mongoose);
const User = require("../app/models/user.model")(mongoose);
const nodeMailer = require("nodemailer");
const moment = require("moment-timezone");
const Cabin = require("cabin");
const fetch = require("node-fetch");
const { Signale } = require("signale");
const fs = require("fs");
var ejs = require("ejs");
const { readFileSync } = require("fs");
const { resolve } = require("path");
const handlebars = require("handlebars");

// initialize cabin
const cabin = new Cabin({
  axe: {
    logger: new Signale(),
  },
});

// store boolean if the job is cancelled
let isCancelled = false;

// handle cancellation (this is a very simple example)
if (parentPort)
  parentPort.once("message", (message) => {
    if (message === "cancel") isCancelled = true;
  });

//Transporter configuration
let transporter = nodeMailer.createTransport({
  host: "smtp.gmail.com",
  service: "gmail",
  port: 465,
  secure: false,
  auth: {
    user: process.env.EMAIL, //REPLACE WITH YOUR EMAIL ADDRESS
    pass: process.env.PASSWORD, //REPLACE WITH YOUR EMAIL PASSWORD
  },
});
(async () => {
  await mongoose.connect(process.env.MONGOURI);
  const jobs = await jobScheduler.find({ isActive: true }).exec();
  await Promise.all(
    jobs.map(async (job) => {
      if (isCancelled) return;
      const user = await User.findOne({ _id: job.user_id }).exec();

      const promises = job.schedule.map(async (item) => {
        try {
          let isExecuted = job.executed;
          //   if (
          //     moment(job.startDate).format("YYYY-MM-DD") ===
          //       moment(item.time, "YYYY-MM-DD")
          //         .tz("asia/jakarta")
          //         .format("YYYY-MM-DD") &&
          //     !isExecuted
          //   ) {
          //     await jobScheduler
          //       .findOneAndUpdate(
          //         { _id: job._id },
          //         { executed: true },
          //         { new: true }
          //       )
          //       .then((data) => {
          //         isExecuted = data.executed;
          //       })
          //       .catch((e) => {
          //         cabin.err(e);
          //       });
          //   }

          const timeNow = moment(new Date()).tz("asia/jakarta");
          const intakeTime = moment(item.time).tz("asia/jakarta");
          const isTaken = item.isTaken;
          let repeatedTimes = item.repeatedTimes;
          const isRepeated = item.isRepeated;
          let delay = 0;
          if (repeatedTimes === 1) {
            delay = 15;
          } else if (repeatedTimes === 2) {
            delay = 30;
          } else {
            delay = 45;
          }
          const isFifteenMin = timeNow.diff(intakeTime, "minutes") >= delay;
          console.log(
            `time now = ${timeNow.minutes()} | intake time = ${intakeTime.minutes()} | ${isFifteenMin}`
          );

          console.log(item);
          console.log(isFifteenMin && !isTaken && repeatedTimes <= 3);
          if (timeNow > intakeTime) {
            if (isFifteenMin && !isTaken && repeatedTimes < 3) {
              //   //Email configuration
              console.log("Send Email!");

              const bodyEmail = {
                email: user.email,
                message: "this is noreply",
                data: job.schedule,
                name: user.name,
              };

              const responseEmail = await fetch(
                `${process.env.API_PROD}/send-email`,
                {
                  method: "POST",
                  body: JSON.stringify(bodyEmail),
                  headers: { "Content-Type": "application/json" },
                }
              );
              const data = responseEmail.json();
              console.log(data);

              const number = user.phone_number;
              const message = "noreply message";
              const body = { number: number, message: message };
              const response = await fetch("http://34.101.83.49/send-message", {
                method: "post",
                body: JSON.stringify(body),
                headers: { "Content-Type": "application/json" },
              });
              const dataWa = response.json();
              console.log(dataWa);
              console.log("item id : ", item._id);

              await jobScheduler
                .findOneAndUpdate(
                  { _id: job._id, "schedule._id": item._id },
                  {
                    $set: {
                      "schedule.$.repeatedTimes": (repeatedTimes += 1),
                      "schedule.$.isRepeated": true,
                    },
                  },
                  { new: true }
                )
                .then((data) => {
                  console.log(data);
                })
                .catch((e) => {
                  cabin.err(e);
                });
            }
          }
        } catch (e) {
          cabin.err(e);
        }
      });
      return Promise.all(promises);
    })
  );
  if (parentPort) parentPort.postMessage("done");
  else process.exit(0);
})();
