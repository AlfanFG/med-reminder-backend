require("dotenv").config();
const mongoose = require("mongoose");
const { parentPort } = require("worker_threads");
const jobScheduler = require("../app/models/jobScheduler.model")(mongoose);
const User = require("../app/models/user.model")(mongoose);
const moment = require("moment-timezone");
const Cabin = require("cabin");
const { Signale } = require("signale");
const fetch = require("node-fetch");

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

          // console.log(
          //   "==========================================================="
          // );
          if (
            moment(new Date(), "HH:mm").tz("asia/jakarta").format("HH:mm") !==
              moment(item.time, "HH:mm").tz("asia/jakarta").format("HH:mm") &&
            isExecuted
          ) {
            // console.log("It is not time yet to send whatsapp");
            // console.log(moment(new Date()).format("YYYY-MM-DD HH:mm"));
            // return;
          } else {
            try {
              //Email configuration
              console.log("send whatsapp!");
              const number = user.phone_number;
              const message = "noreply message";
              const body = { number: number, message: message };
              const dev = process.env.NODE_ENV !== "production";
              const server = dev
                ? "http://localhost:8080"
                : "http://34.128.119.246";
              await fetch(`${server}/send-message`, {
                method: "post",
                body: JSON.stringify(body),
                headers: { "Content-Type": "application/json" },
              })
                .then((data) => {
                  console.log("Message Sent!");
                })
                .catch((err) => {
                  console.log(err);
                });

              // const data = await response.json();
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
