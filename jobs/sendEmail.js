require("dotenv").config();
const { workerData } = require("worker_threads");
const nodeMailer = require("nodemailer");

async function main() {
  console.log(workerData.description);
  console.log(process.env.EMAIL);
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
  await transporter.sendMail({
    from: "alfanfgifary18@if.unjani.ac.id", //SENDER
    to: "alfanfaturahman10@gmail.com, alfansafutra@gmail.com", //MULTIPLE RECEIVERS
    subject: "Hello", //EMAIL SUBJECT
    text: "This is a test email.", //EMAIL BODY IN TEXT FORMAT
    html: "<b>This is a test email.</b>", //EMAIL BODY IN HTML FORMAT
  });
}

main().catch((err) => console.log(err));
