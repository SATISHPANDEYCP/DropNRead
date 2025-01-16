const express = require("express");
const router = express.Router();
const Chat = require("../models/chat");

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

// Index Route: Display all chats
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userName = req.session.user.name;
    // Case insensitive comparison
    const chats = await Chat.find({
      $or: [
        { to: { $regex: `^${userName}$`, $options: 'i' } },
        { from: { $regex: `^${userName}$`, $options: 'i' } }
      ]
    });

    res.render("index", { chats, userName });
  } catch (err) {
    console.error("Error fetching chats:", err);
    res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
  }
});

// New Chat Form
router.get("/new", isAuthenticated, (req, res) => {
  const userName = req.session.user.name;
  res.render("new", { userName });
});

// Create Chat
router.post("/", isAuthenticated, async (req, res) => {
  const { to, message } = req.body;
  const from = req.session.user.name;
  try {
    const newChat = new Chat({
      from,
      to,
      message,
      created_at: new Date()
    });
    await newChat.save();
    res.redirect("/chats");
  } catch (err) {
    console.error("Error saving chat:", err);
    res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
  }
});

// Edit Chat
router.get("/:id/edit", isAuthenticated, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (chat.from !== req.session.user.name) {
      return res.render("wrong.ejs", {
        msg: {
          m1: "Oops! You are not authorized to modify this chat.",
          m2: "Only the sender of this message can edit or delete it. Please check your messages and try again."
        }
      });
    }
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
    res.redirect("/chats");
  } catch (err) {
    console.error("Error updating chat:", err);
    res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
  }
});

// Delete Chat
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (chat.from !== req.session.user.name) {
      return res.render("wrong.ejs", {
        msg: {
          m1: "Oops! You are not authorized to modify this chat.",
          m2: "Only the sender of this message can edit or delete it. Please check your messages and try again."
        }
      });
    }
    await Chat.findByIdAndDelete(req.params.id);
    res.redirect("/chats");
  } catch (err) {
    console.error("Error deleting chat:", err);
    res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
  }
});

module.exports = router;
