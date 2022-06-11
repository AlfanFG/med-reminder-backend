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
          const isFifteenMin = timeNow.minutes() - intakeTime.minutes() >= 15;
          const isTaken = item.isTaken;
          const repeatedTimes = item.repeatedTimes;
          const isRepeated = item.isRepeated;
          if (timeNow > intakeTime) {
            if (isFifteenMin && !isTaken && repeatedTimes <= 3 && isRepeated) {
              //Email configuration
              console.log("Send Email!");
              await transporter.sendMail({
                from: process.env.EMAIL, //SENDER
                to: user.email, //MULTIPLE RECEIVERS
                subject: "Hello! i think you are forgetting something", //EMAIL SUBJECT
                text: "Have you taken your medicines?", //EMAIL BODY IN TEXT FORMAT
                html: "<b>Have you taken your medicines?</b>", //EMAIL BODY IN HTML FORMAT
              });

              const number = user.phone_number;
              const message = "noreply message";
              const body = { number: number, message: message };
              await fetch("http://34.101.83.49/send-message", {
                method: "post",
                body: JSON.stringify(body),
                headers: { "Content-Type": "application/json" },
              })
                .then((result) => {
                  console.log("Send Whatsapp Successfull!");
                })
                .catch((err) => {
                  console.log(err);
                });

              await jobScheduler
                .findOneAndUpdate(
                  { _id: job._id, "schedule._id": item._id },
                  {
                    $set: {
                      "schedule.$.repeatedTimes": repeatedTimes++,
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