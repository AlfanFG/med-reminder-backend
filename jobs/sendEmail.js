require("dotenv").config();
const mongoose = require("mongoose");
const { workerData } = require("worker_threads");
const nodeMailer = require("nodemailer");
const jobScheduler = require("../app/models/jobScheduler.model")(mongoose);
const User = require("../app/models/user.model")(mongoose);
async function main() {
  await mongoose.connect(
    "mongodb+srv://alfan:heathcliff123@cluster0.xzqwb.mongodb.net/med_reminder?retryWrites=true&w=majority"
    // { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true }
  );

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

  //Email configuration
  console.log("testing!");
  await transporter.sendMail({
    from: "alfanfgifary18@if.unjani.ac.id", //SENDER
    to: "alfanfaturahman10@gmail.com, alfansafutra@gmail.com", //MULTIPLE RECEIVERS
    subject: "Hello", //EMAIL SUBJECT
    text: "This is a test email.", //EMAIL BODY IN TEXT FORMAT
    html: "<b>This is a test email.</b>", //EMAIL BODY IN HTML FORMAT
  });
}

main().catch((err) => console.log(err));
