const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/user");
const Chat = require("../models/chat");
const { body, validationResult } = require("express-validator");

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (!req.session.user) {
        console.log("session not found we redirect on login.");
        return res.redirect("/login");
    }
    console.log("session found.");
    next()
}

// Render Login Page
router.get("/login", (req, res) => res.render("login"));

// Handle Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            console.log("User Not Found or incorrect details at login.");
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! We couldn't find the user, or the details provided are incorrect.",
                    m2: "Please verify the details and try again with the correct information."
                }
            });
        }

        // Store user info in session
        req.session.user = { name: user.name, username: user.username, email: user.email };
        console.log("User Found and redirected to login.");
        res.redirect("/chats");
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
    }
});

// Profile Section
router.get("/profile", isAuthenticated, (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) {
        console.log("User Not Found and redirected at login.");
        return res.redirect("/login");
    }
    console.log("User Found and render profile.");
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
            .isLength({ min: 5 })
            .withMessage("Password must be at least 5 characters long.")
            .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/)
            .withMessage("Password must contain at least one letter, one number, and one special character."),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log("Registration is terminated with error:", errors.array().map((error) => error.msg).join(" "));
            return res.status(400).render("wrong.ejs", {
                msg: {
                    m1: "Validation failed.Please check the following issues:",
                    m2: errors.array().map((error) => error.msg).join(" "),

                },
            });
        }

        let { name, email, username, password } = req.body;
        name = name.trim();
        email = email.trim();
        username = username.trim();
        try {
            if (!name || !email || !username || !password) {
                console.log("Validation errors,All filds require:", errors.array());
                return res.render("wrongSingle.ejs", { msgs: "All fields are required." });
            }
            const existingUser = await User.findOne({
                $or: [
                    { email: { $regex: new RegExp(`^${email}$`, 'i') } },
                    { username: { $regex: new RegExp(`^${username}$`, 'i') } }
                ]
            });

            if (existingUser) {
                console.log("Account already exists for email/username:", email, username);
                return res.render("wrong.ejs", {
                    msg: {
                        m1: "Username or email already in use.",
                        m2: "Please choose unique credentials or log in to your account.",
                    },
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ name, username, email, password: hashedPassword });
            await newUser.save();
            console.log("Profile Cerated Redirected on login page.");
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
router.post("/reset-password", [
    body("username").trim().notEmpty().withMessage("Username is required."),
    body("email").trim().isEmail().withMessage("Invalid email."),
    body("password")
        .isLength({ min: 5 })
        .withMessage("New Password must be at least 5 characters long.")
        .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/)
        .withMessage("Password must contain at least one letter, one number, and one special character."),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render("wrong.ejs", {
            msg: {
                m1: "err!, Please address the following issues:",
                m2: errors.array().map(error => `<strong>${error.param}</strong>: ${error.msg}`).join("<br>"),
            }
        });        
    }

    let { username, email, password } = req.body;

    try {
        const user = await User.findOne({
            $and: [
                { username: { $regex: new RegExp(`^${username}$`, 'i') } },
                { email: { $regex: new RegExp(`^${email}$`, 'i') } }
            ]
        });

        if (!user) {
            console.log("User not found for password reset.");
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! We couldn't find the user, or the details provided are incorrect.",
                    m2: "Please verify the details and try again with the correct information."
                }
            });
        }

        const isSamePassword = await bcrypt.compare(password, user.password);
        if (isSamePassword) {
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! The new password cannot be the same as the old password.",
                    m2: "Please choose a different password and try again."
                }
            });
        }

        user.password = await bcrypt.hash(password, 10);
        await user.save();
        console.log(`Password reset successful for user: ${username}`);
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
    let { username, name, email, password } = req.body;
    username = username.trim();
    name = name.trim();
    email = email.trim();
    try {
        const user = await User.findOne({
            $and: [
                { username: { $regex: new RegExp(`^${username}$`, 'i') } },
                { name: { $regex: new RegExp(`^${name}$`, 'i') } },
                { email: { $regex: new RegExp(`^${email}$`, 'i') } }
            ]
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            console.log("User Not found At delete Account.");
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! We couldn't find the user, or the details provided are incorrect.",
                    m2: "Please verify the details and try again with the correct information."
                }
            });
        }
        console.log("All Chat is deleted of User.");
        await Chat.deleteMany({ username: username, email: email });
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
    console.log("cookies deleted.");
    res.redirect("/login");
})

module.exports = router;