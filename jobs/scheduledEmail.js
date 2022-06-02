const dotenv = require("dotenv").config();
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
  let i = 0;
  await Promise.all(
    jobs.map(async (job) => {
      if (isCancelled) return;

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
          console.log(
            "==========================================================="
          );
          console.log("time now", moment(new Date()).format("HH:mm"));
          console.log(
            "reminder time",
            moment(item.time, "HH:mm").tz("asia/jakarta").format("HH:mm")
          );
          console.log(
            "==========================================================="
          );
          if (
            moment(new Date()).format("HH:mm") !==
              moment(item.time, "HH:mm").tz("asia/jakarta").format("HH:mm") &&
            isExecuted
          ) {
            console.log("It is not time yet to post tweet");
            // console.log(moment(new Date()).format("YYYY-MM-DD HH:mm"));

            // return;
          } else {
            try {
              //Email configuration
              console.log("send email");
              await transporter.sendMail({
                from: "alfanfgifary18@if.unjani.ac.id", //SENDER
                to: "alfanfaturahman10@gmail.com, alfansafutra@gmail.com", //MULTIPLE RECEIVERS
                subject: "Hello", //EMAIL SUBJECT
                text: "This is a test email.", //EMAIL BODY IN TEXT FORMAT
                html: "<b>This is a test email.</b>", //EMAIL BODY IN HTML FORMAT
              });
              // await jobScheduler
              //   .findOneAndUpdate({ _id: job._id }, { isActive: false })
              //   .exec();
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
