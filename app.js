const express = require("express");
const cors = require("cors");
const Bree = require("bree");
const Cabin = require("cabin");
const Graceful = require("@ladjs/graceful");
const { Signale } = require("signale");
require("./utils/db");
const nodeMailer = require("nodemailer");
const { Client, LocalAuth } = require("whatsapp-web.js");
var qrcode = require("qrcode-terminal");
const app = express();
const handlebars = require("handlebars");
const { readFileSync } = require("fs");
const { resolve } = require("path");
const moment = require("moment-timezone");
const { ServiceAccount } = require("firebase-admin");
const serviceAccount = require("./utils/fcm_credentials.json");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://medreminder-2e833-default-rtdb.asia-southeast1.firebasedatabase.app",
});

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

const emailTemplateSource = readFileSync(
  resolve(__dirname, "./email_temp/medicines.hbs"),
  "utf8"
);

app.post("/send-email", (req, res) => {
  const { email, message, data, name } = req.body;
  let temp = "";
  data.map((item) => {
    const time = moment(item.time).tz("asia/jakarta").format("HH:mm");
    temp += `<tr style="border-bottom: 1px solid rgba(0,0,0,.05);"><td valign='middle' style='text-align:left; padding: 0 2.5em;'>${item.medName}</td><td valign='middle' style='text-align:left; padding: 0 2.5em;'>${item.takePill}</td><td valign='middle' style='text-align:left; padding: 0 2.5em;'>${time}</td></tr>`;
  });
  console.log(req.body);
  const emailHtml = handlebars.compile(emailTemplateSource)({
    data: temp,
    mesage: message,
    name: name,
  });

  transporter
    .sendMail({
      from: process.env.EMAIL, //SENDER
      to: email, //MULTIPLE RECEIVERS
      subject: "Hello", //EMAIL SUBJECT
      text: "This is a test email.", //EMAIL BODY IN TEXT FORMAT
      html: emailHtml, //EMAIL BODY IN HTML FORMAT
    })
    .then((response) => {
      res.status(200).json({
        status: true,
        response: "Succeed!",
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });
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
app.post("/send-notification", (req, res) => {
  const { fcm, item } = req.body;

  const message = {
    tokens: [fcm],
    notification: {
      title: "Take your medicine!",
      body: "Tap this for detail",
    },
    data: { data: JSON.stringify(item) },
  };

  if (fcm !== "")
    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        res.status(200).json({
          status: true,
          response: "Success!",
        });
      })
      .catch((error) => {
        res.status(400).json({
          status: false,
          response: error,
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
    // {
    //   name: "scheduledNotification",
    //   interval: "1m",
    // },
    {
      name: "untakenMedicine",
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
