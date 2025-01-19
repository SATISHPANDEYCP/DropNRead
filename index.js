const express = require("express");
const session = require('cookie-session');
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const methodOverride = require("method-override");
require("dotenv").config();
const favicon = require('serve-favicon');
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");

// Initialize App
const app = express();
const PORT = process.env.PORT || 8000;
const URI = process.env.MONGO_URI;

// Database Connection
mongoose
  .connect(URI)
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("DB connection error:", err));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(cookieParser());

// Session middleware
app.use(session({
  name: 'session',
  keys: [process.env.SESSION_KEY],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure:false
}));

// Routes
const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");
app.use("/chats", chatRoutes); // Handle chat-related routes
app.use("/", authRoutes); // Handle authentication-related routes

// Redirect to login or chats based on session
app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/chats");
  }
  res.render("login");
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start Server
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
