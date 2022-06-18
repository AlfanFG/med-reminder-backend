require("dotenv").config();
const mongoose = require("mongoose");
const { workerData } = require("worker_threads");
const { parentPort } = require("worker_threads");
const jobScheduler = require("../app/models/jobScheduler.model")(mongoose);
const User = require("../app/models/user.model")(mongoose);
const moment = require("moment-timezone");
const Cabin = require("cabin");
const { Signale } = require("signale");
const fetch = require("node-fetch");
const notificationService = require("../helper-function/notificationService");
const { ServiceAccount } = require("firebase-admin");
const serviceAccount = require("../utils/fcm_credentials.json");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://medreminder-2e833-default-rtdb.asia-southeast1.firebasedatabase.app",
});

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

const pushNotificationOne = (data, token) => {};

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
          console.log(
            "==========================================================="
          );
          console.log(
            "time now",
            moment(new Date()).tz("asia/jakarta").format("HH:mm")
          );
          console.log(
            "reminder time",
            moment(item.time, "HH:mm").tz("asia/jakarta").format("HH:mm")
          );

          console.log(
            "==========================================================="
          );
          if (
            moment(new Date(), "HH:mm").tz("asia/jakarta").format("HH:mm") !==
              moment(item.time, "HH:mm").tz("asia/jakarta").format("HH:mm") &&
            isExecuted
          ) {
            console.log("It is not time yet to send email");
            // console.log(moment(new Date()).format("YYYY-MM-DD HH:mm"));

            // return;
          } else {
            try {
              console.log("Send Notification");

              const fcm = user.fcm ? user.fcm : "";
              const message = {
                tokens: [fcm],
                notification: {
                  title: "Take your medicine!",
                  body: "Tap this for detail",
                },
                data: { data: JSON.stringify(item) },
              };

              if (fcm !== "")
                await admin
                  .messaging()
                  .sendMulticast(message)
                  .then((response) => {
                    console.log("Successfully sent message");
                  })
                  .catch((error) => {
                    console.log("Error sending message:", error);
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
