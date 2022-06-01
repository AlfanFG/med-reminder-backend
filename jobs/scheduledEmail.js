require("dotenv").config();
const mongoose = require("mongoose");
const { workerData } = require("worker_threads");
const { parentPort } = require("worker_threads");
const jobScheduler = require("../app/models/jobScheduler.model")(mongoose);
const User = require("../app/models/user.model")(mongoose);
const nodeMailer = require("nodemailer");
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
  const jobs = await jobScheduler.find({ isActive: true }).exec();
  console.log(jobs);

  // await Promise.all(
  //   jobs.map(async (job) => {
  //     if (isCancelled) return;
  //     console.log("rgg4");
  //     job.schedule.map(async (item) => {
  //       try {
  //         const user = await User.findById({ _id: job.user_id }).exec();
  //         if (
  //           moment().tz("asia/jakarta").format("YYYY-MM-DD HH:mm") <
  //           moment(item.time, "YYYY-MM-DD HH:mm").format("YYYY-MM-DD HH:mm")
  //         ) {
  //           console.log("It is not time yet to post tweet");
  //           // return;
  //           resolve();
  //         } else {
  //           console.log("==================");
  //           try {
  //             //Email configuration
  //             await transporter.sendMail({
  //               from: "alfanfgifary18@if.unjani.ac.id", //SENDER
  //               to: "alfanfaturahman10@gmail.com, alfansafutra@gmail.com", //MULTIPLE RECEIVERS
  //               subject: "Hello", //EMAIL SUBJECT
  //               text: "This is a test email.", //EMAIL BODY IN TEXT FORMAT
  //               html: "<b>This is a test email.</b>", //EMAIL BODY IN HTML FORMAT
  //             });
  //             await jobScheduler.findOneAndUpdate(
  //               { _id: job._id },
  //               { isActive: false }
  //             );
  //           } catch (e) {
  //             cabin.error(e);
  //           }
  //         }
  //       } catch (e) {
  //         cabin.error(e);
  //       }
  //     });
  //   })
  // );
  if (parentPort) parentPort.postMessage("done");
  else process.exit(0);
})();
