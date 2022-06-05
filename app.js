const express = require("express");
const cors = require("cors");
const Bree = require("bree");
const Cabin = require("cabin");
const Graceful = require("@ladjs/graceful");
const { Signale } = require("signale");
require("./utils/db");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello World!!!!!!!!!!!!!!!!!!!!");
});

require("./app/routes/post.routes")(app);
require("./app/routes/jobScheduler.routes")(app);
require("./app/routes/user.routes")(app);
const cabin = new Cabin({
  axe: {
    logger: new Signale(),
  },
});
const bree = new Bree({
  logger: cabin,
  jobs: [
    {
      name: "scheduledEmail",
      interval: "1m",
      // worker: {
      //   workerData: {
      //     description: "This job will send emails.",
      //   },
      // },
    },
  ],
});

// handle graceful reloads, pm2 support, and events like SIGHUP, SIGINT, etc.
const graceful = new Graceful({ brees: [bree] });
graceful.listen();

bree.start();

const port = process.env.PORT || 8000;
app.listen(port, () => [
  console.log(`Mongo Contact App | Listening at http://localhost:${port}`),
]);
