const express = require("express");
const cors = require("cors");
const Bree = require("bree");
const Cabin = require("cabin");
const Graceful = require("@ladjs/graceful");
const { Signale } = require("signale");
require("./utils/db");
const { Client, LocalAuth } = require("whatsapp-web.js");
var qrcode = require("qrcode-terminal");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
  },
});

app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.post("/send-message", (req, res) => {
  const number = req.body.number;
  const message = req.body.message;
  client
    .sendMessage(number, message)
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });
});

client.on("qr", (qr) => {
  // Generate and scan this code with your phone
  console.log("QR RECEIVED", qr);
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("AUTHENTICATED");
});

client.on("auth_failure", (msg) => {
  // Fired if session restore was unsuccessful
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message", (msg) => {
  if (msg.body == "!ping") {
    console.log(msg.body);
    msg.reply("pong");
  }
});

client.initialize();

//Twilio
// app.post("/sendWhatsapp", async (req, res) => {
//   let message = req.body.Body;
//   let senderID = req.body.From;

//   console.log(message);
//   console.log(senderID);
//   //Write a function to send message back to Whatsapp
//   await WA.sendMessage("Hello from the other side.", senderID);
// });

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
      name: "substractDays",
      interval: "1m",
    },
    {
      name: "scheduledEmail",
      interval: "1m",
    },
    {
      name: "scheduledWhatsapp",
      interval: "1m",
    },
  ],
});

// handle graceful reloads, pm2 support, and events like SIGHUP, SIGINT, etc.
const graceful = new Graceful({ brees: [bree] });
graceful.listen();

bree.start();

const port = process.env.PORT || 8080;
app.listen(port, () => [
  console.log(`Medreminder Server | Listening at http://localhost:${port}`),
]);
