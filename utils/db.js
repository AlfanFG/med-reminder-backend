const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
mongoose.connect(dotenv.parsed.MONGOURI);
