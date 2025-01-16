const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/user");
const Chat = require("../models/chat");
const { body, validationResult } = require("express-validator");

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
}

// Render Login Page
router.get("/login", (req, res) => res.render("login"));

// Handle Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! We couldn't find the user, or the details provided are incorrect.",
                    m2: "Please verify the details and try again with the correct information."
                }
            });
        }

        // Store user info in session
        req.session.user = { name: user.name, username: user.username, email: user.email };
        res.redirect("/chats");
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
    }
});

// Profile Section
router.get("/profile", isAuthenticated, (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) return res.redirect("/login");
    res.render("profile.ejs", { currentUser });
});

// Render Registration Page
router.get("/register", (req, res) => res.render("register"));

// Handle Registration with Validation
router.post(
    "/register",
    [
        body("name").notEmpty().withMessage("Name is required."),
        body("email").isEmail().withMessage("Invalid email."),
        body("username").notEmpty().withMessage("Username is required."),
        body("password")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters long."),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Validation failed. Please check the following issues:",
                    m2: errors.array().map((error) => error.msg).join(" "),
                },
            });
        }

        const { name, email, username, password } = req.body;

        try {
            if (!name || !email || !username || !password) {
                return res.render("wrongSingle.ejs", { msgs: "All fields are required." });
            }

            const existingUser = await User.findOne({ $or: [{ email }, { username }] });

            if (existingUser) {
                return res.render("wrong.ejs", {
                    msg: {
                        m1: "Oops! The username or email is already in use.",
                        m2: "Please use a unique username or email, or login if you already have an account.",
                    },
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ name, username, email, password: hashedPassword });
            await newUser.save();
            res.redirect("/login");
        } catch (err) {
            console.error("Error during registration:", err);
            res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
        }
    }
);

// Render Reset Password Page
router.get("/reset-password", (req, res) => res.render("resetPassword"));

// Handle Password Reset
router.post("/reset-password", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const user = await User.findOne({ username, email });
        if (!user) {
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! We couldn't find the user, or the details provided are incorrect.",
                    m2: "Please verify the details and try again with the correct information."
                }
            });
        }

        user.password = await bcrypt.hash(password, 10);
        await user.save();
        res.redirect("/login");
    } catch (err) {
        console.error("Error resetting password:", err);
        res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
    }
});

// Render Delete User Page
router.get("/deleteUser", isAuthenticated, (req, res) => res.render("deleteUser"));

// Handle User Deletion
router.delete("/deleteUser", isAuthenticated, async (req, res) => {
    const { username, name, email, password } = req.body;
    try {
        const user = await User.findOne({ username, name, email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! We couldn't find the user, or the details provided are incorrect.",
                    m2: "Please verify the details and try again with the correct information."
                }
            });
        }

        await Chat.deleteMany({ from: name });
        await User.deleteOne({ _id: user._id });
        res.redirect("/login");
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
    }
});

// Logout
router.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
});

module.exports = router;