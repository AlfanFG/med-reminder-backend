require("dotenv").config();
const mongoose = require("mongoose");
const { workerData } = require("worker_threads");
const { parentPort } = require("worker_threads");
const jobScheduler = require("../app/models/jobScheduler.model")(mongoose);
const User = require("../app/models/user.model")(mongoose);
const nodeMailer = require("nodemailer");
const moment = require("moment-timezone");
const Cabin = require("cabin");
const { Signale } = require("signale");

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
          if (
            moment(job.startDate).format("YYYY-MM-DD") ===
              moment(item.time, "YYYY-MM-DD")
                .tz("asia/jakarta")
                .format("YYYY-MM-DD") &&
            !isExecuted
          ) {
            await jobScheduler
              .findOneAndUpdate(
                { _id: job._id },
                { executed: true },
                { new: true }
              )
              .then((data) => {
                isExecuted = data.executed;
              })
              .catch((e) => {
                cabin.err(e);
              });
          }

          const midNight = moment().startOf("day").format("HH:mm");

          const timeNow = moment(new Date()).tz("asia/jakarta").format("HH:mm");

          if (job.isActive && job.numberOfDays === 0) {
            await jobScheduler
              .findOneAndUpdate({ _id: job._id }, { isActive: false })
              .then((data) => {
                console.log(`reminder set to inactive!`);
              })
              .catch((e) => {
                cabin.err(e);
              });
          }

          if (isExecuted && timeNow === midNight) {
            try {
              //Email configuration
              await jobScheduler
                .findOneAndUpdate(
                  { _id: job._id },
                  { numberOfDays: job.numberOfDays - 1 },
                  { new: true }
                )
                .then((data) => {
                  console.log(`day substracted ${data.numberOfDays} left!`);
                })
                .catch((e) => {
                  cabin.err(e);
                });
            } catch (e) {
              cabin.error(e);
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
