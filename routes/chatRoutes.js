const express = require("express");
const router = express.Router();
const moment = require('moment-timezone'); 
const Chat = require("../models/chat");
const User = require("../models/user");

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    console.log("session not found we redirect on login.");
    return res.redirect("/login");
  }
  console.log("session found.");
  next();
}

// Index Route: Display all chats
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userName = req.session.user.name.trim(); 
    const userUsername = req.session.user.username.trim();
    // Check if userName or userUsername exists and is valid
    if (!userName || userName === "" || !userUsername || userUsername === "") {
      return res.status(400).render("wrongSingle.ejs", { msgs: "User information is missing or invalid." });
    }
    // Fetch chats where `to` matches userName or `username` matches userUsername
    const chats = await Chat.find({
      $or: [
        { to: { $regex: `^${userName}$`, $options: "i" } }, // Case-insensitive match for `to`
        { username: { $regex: `^${userUsername}$`, $options: "i" } } // Case-insensitive match for `username`
      ]
    }).sort({ created_at: -1 }); 

     // Convert `created_at` to Asia/Kolkata time (UTC+5:30)
    //  chats.forEach(chat => {
    //   chat.created_at = moment(chat.created_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    // });

    console.log("We render chat Page with User Name.");
    res.render("index", { chats, userName });
  } catch (err) {
    console.error("Error fetching chats:", err);
    res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
  }
});

// New Chat Form
router.get("/new", isAuthenticated, (req, res) => {
  const userName = req.session.user.name;
  console.log("User found in session we redirect it on New chat Page.")
  res.render("new", { userName });
});

// Create Chat
router.post("/", isAuthenticated, async (req, res) => {
  let { to, message } = req.body;
  const from = req.session.user.name;
  const username = req.session.user.username;
  const email = req.session.user.email;
  to = to.trim();
  try {
    const newChat = new Chat({
      from,
      to,
      username,
      email,
      message,
      created_at: new Date()
    });
    await newChat.save();
    console.log("chat posted.");
    res.redirect("/chats");
  } catch (err) {
    console.error("Error saving chat:", err);
    res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
  }
});

// Edit Chat
router.get("/:id/edit", isAuthenticated, async (req, res) => {
  try {
    // Check if chat exists
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).render("wrongSingle.ejs", { msgs: "Chat not found." });
    }
    if (
      (chat.from && String(chat.from).toLowerCase() !== String(req.session.user.name).toLowerCase()) ||
      (chat.username && String(chat.username).toLowerCase() !== String(req.session.user.username).toLowerCase()) ||
      (chat.email && String(chat.email).toLowerCase() !== String(req.session.user.email).toLowerCase())
    ) {
      console.log("User's Full Name/Username/email is Wrong.");
      return res.render("wrong.ejs", {
        msg: {
          m1: "Oops! You are not authorized to modify this chat.",
          m2: "Only the sender of this message can edit or delete it. Please check your messages and try again."
        }
      });
    }
    console.log("User's Full Name Matched we rendere Edit Page.");
    res.render("edit", { chat });
  } catch (err) {
    console.error("Error finding chat:", err);
    res.status(404).render("wrongSingle.ejs", { msgs: "Oops! Chat not found." });
  }
});

// Update Chat
router.put("/:id", isAuthenticated, async (req, res) => {
  const { newMsg } = req.body;
  try {
    await Chat.findByIdAndUpdate(req.params.id, { message: newMsg }, { new: true });
    console.log("Updated User's Message we redirect you on chat page.");
    res.redirect("/chats");
  } catch (err) {
    console.error("Error updating chat:", err);
    res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
  }
});

// Delete Chat
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    // Check if chat exists
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).render("wrongSingle.ejs", { msgs: "Chat not found." });
    }
    // Find user by chat sender
    const user = await User.findOne({ name: chat.from });
    if (!user) {
      console.log("User not found.");
      return res.render("wrong.ejs", {
        msg: {
          m1: "User not found.",
          m2: "Please try again later."
        }
      });
    }
    if (
      (chat.from && String(chat.from).toLowerCase() !== String(req.session.user.name).toLowerCase()) ||
      (chat.username && String(chat.username).toLowerCase() !== String(req.session.user.username).toLowerCase()) ||
      (chat.email && String(chat.email).toLowerCase() !== String(req.session.user.email).toLowerCase())
    ) {
      console.log("User's Full Name/Username/email is Wrong.");
      return res.render("wrong.ejs", {
        msg: {
          m1: "Oops! You are not authorized to modify this chat.",
          m2: "Only the sender of this message can edit or delete it. Please check your messages and try again."
        }
      });
    }
    await Chat.findByIdAndDelete(req.params.id);
    res.render("popup.ejs", {
      message: "Chat deleted successfully. You will be redirected to the chats page shortly.",
      redirectUrl: "/chats"
    });
  } catch (err) {
    console.error("Error deleting chat:", err);
    res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
  }
});

module.exports = router; 
