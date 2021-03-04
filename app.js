//jshint esversion: 6

const path = require("path")
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const request = require("request");
const http = require("http");
const mongoose = require("mongoose");
const socketio = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./controllers/db");
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const botName = "COVID-19 Utility Bot";
const JWT_SECRET = "ksjdfnkdsfjdshgjdskgbdskjgbdskjgb"

// load env vars
dotenv.config({
  path: "./config/config.env"
});

// Body parser

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Enable cors

app.use(cors());

// Chat Module

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({
    username,
    room
  }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to COVID-19 Utility Chat!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

// Connection to DB
connectDB();

// Users Schema

const userSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  collection: "users"
})

const User = mongoose.model("User", userSchema);

// Patient Schema

const patientSchema = new mongoose.Schema({
  patientID: Number,
  name: String,
  age: Number,
  gender: String,
  previouslyDiagnosed: Boolean,
  bloodGroup: String,
});

const Patient = mongoose.model("Patient", patientSchema);

// Doctor Schema

const doctorSchema = new mongoose.Schema({
  doctorID: Number,
  name: String,
  age: Number,
  qualification: String,
  experience: String,
  location: String,
  feedback: Number
});

const Doctor = mongoose.model("Doctor", doctorSchema);

// COVID-19 API

var worldWideCases;
var worldWideTodayCases;
var worldWideDeaths;
var worldWideTodayDeaths;
var worldWideRecovered;
var worldWideTodayRecovered;
var worldWideActive;
var worldWideCritical;

request("https://disease.sh/v3/covid-19/all", function (error, response, body) {
  data = JSON.parse(body);
  worldWideCases = data.cases;
  worldWideTodayCases = data.todayCases;
  worldWideDeaths = data.deaths;
  worldWideTodayDeaths = data.todayDeaths;
  worldWideRecovered = data.recovered;
  worldWideTodayRecovered = data.todayRecovered;
  worldWideActive = data.active;
  worldWideCritical = data.critical;
})

var pakistanCases;
var pakistanTodayCases;
var pakistanDeaths;
var pakistanTodayDeaths;
var pakistanRecovered;
var pakistanTodayRecovered;
var pakistanActive;
var pakistanCritical;

request("https://disease.sh/v3/covid-19/countries/Pakistan?strict=true", function (error, response, body) {
  data = JSON.parse(body);
  pakistanCases = data.cases;
  pakistanTodayCases = data.todayCases;
  pakistanDeaths = data.deaths;
  pakistanTodayDeaths = data.todayDeaths;
  pakistanRecovered = data.recovered;
  pakistanTodayRecovered = data.todayRecovered;
  pakistanActive = data.active;
  pakistanCritical = data.critical;
})


//GET Routes
app.get("/", function (req, res) {
  res.render("welcome");
});

app.get("/signup", function (req, res) {
  res.render("signup");
})

app.get("/signin", function (req, res) {
  res.render("signin");
});

app.get("/home", function (req, res) {
  res.render("home", {
    pakistanCases: pakistanCases,
    pakistanTodayCases: pakistanTodayCases,
    pakistanDeaths: pakistanDeaths,
    pakistanTodayDeaths: pakistanTodayDeaths,
    pakistanRecovered: pakistanRecovered,
    pakistanTodayRecovered: pakistanTodayRecovered,
    pakistanActive: pakistanActive,
    pakistanCritical: pakistanCritical,
    worldWideCases: worldWideCases,
    worldWideTodayCases: worldWideTodayCases,
    worldWideDeaths: worldWideDeaths,
    worldWideTodayDeaths: worldWideTodayDeaths,
    worldWideRecovered: worldWideRecovered,
    worldWideTodayRecovered: worldWideTodayRecovered,
    worldWideActive: worldWideActive,
    worldWideCritical: worldWideCritical
  });
});

app.get("/chat", function (req, res) {
  res.render("chat");
});

app.get("/index", function (req, res) {
  res.render("index");
});

app.get("/profile", function (req, res) {
  res.render("home");
});

app.use('/api/v1/stores', require('./routes/stores'));

//POST Routes

// app.post("/api/register", async (req, res) => {
//
//   const {
//     email,
//     password: plainTextPassword
//   } = req.body;
//
//   if (!email || typeof email !== "string") {
//     return res.json({
//       status: "error",
//       error: "Invalid email"
//     })
//   }
//
//   if (!plainTextPassword || typeof plainTextPassword !== "string") {
//     return res.json({
//       status: "error",
//       error: "Invalid password"
//     })
//   }
//
//   if (plainTextPassword.length < 5) {
//     return res.json({
//       status: "error",
//       error: "Password too small. It should be atleast 6 characters."
//     })
//   }
//
//   const password = await bcrypt.hash(plainTextPassword, 10);
//
//   try {
//     const response = await User.create({
//       email,
//       password
//     })
//     console.log("User created successfully: ", response);
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.json({
//         status: 'error',
//         error: "Email already in use."
//       })
//     }
//     throw error;
//   }
//
//   res.json({
//     status: 'ok'
//   });
// });

app.post("/signup", function(req, res){
    const userEmail = req.body.email;
    const userPassword = req.body.password;


    User.findOne({email: userEmail}, function(err, foundList){
      if(!err){
        if(!foundList){
          console.log("User is not registered");
          const newUser = newUser({
            email: userEmail,
            password: userPassword
          });

          newUser.save();
          res.render("signin");
        } else {
          alreadyRegisteredError = true;
          console.log("User is registered");
          res.render("signup");
        }
      }
    })
});
//
// app.post("/api/login", async (req, res) => {
//
//   const {
//     email,
//     password
//   } = req.body;
//
//   const user = await User.findOne({
//     email,
//   }).lean()
//
//   if (!user) {
//     return res.json({
//       status: "error",
//       error: "Invalid username/password!"
//     });
//   }
//
//   if (await bcrypt.compare(password, user.password)) {
//
//     // The username/password is matched
//
//     const token = jwt.sign({
//       id: user._id,
//       email: user.email
//     }, JWT_SECRET);
//
//     return res.json({
//       status: "ok",
//       data: token
//     });
//   }
//
//   res.json({
//     status: "error",
//     data: "Invalid username/password!"
//   })
// })

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
