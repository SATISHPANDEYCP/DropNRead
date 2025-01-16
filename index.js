const express = require("express");
const session = require('cookie-session');
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const methodOverride = require("method-override");
require("dotenv").config();
const favicon = require('serve-favicon');
const cookieParser = require("cookie-parser");

// Initialize App
const app = express();
const PORT = process.env.PORT || 8000;
const URI = process.env.MONGO_URI;

// Database Connection
mongoose
  .connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
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

// Session Middleware
app.use(session({
  name: 'session',
  keys: [process.env.SESSION_KEY || 'defaultSecretKey'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Secure cookies in production
  sameSite: 'lax', // Adjust if needed
}));

// Log session for debugging (optional during development)
app.use((req, res, next) => {
  console.log("Session data:", req.session);
  next();
});

// Routes
const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");
app.use("/chats", chatRoutes); // Handle chat-related routes
app.use("/", authRoutes); // Handle authentication-related routes

// Redirect to login or chats based on session
app.get("/", (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect("/chats");
  }
  res.render("login");
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Error handler middleware triggered:", err.stack);
  res.status(500).render("error.ejs", { message: "Something went wrong! Please try again later." });
});

// Start Server
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
