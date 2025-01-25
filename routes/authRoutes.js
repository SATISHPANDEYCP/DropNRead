const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/user");
const Chat = require("../models/chat");
const nodemailer = require("nodemailer");
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
        return res.render("popup.ejs", {
            message: {
                m1: "Welcome to DropNRead!",
                m2: "A platform where you can leave a message for someone special by their name."
            },
            redirectUrl: "/chats/dashboard"
        });
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
    }
});


// Profile Section
router.get("/profile", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.session.user.username });
        if (!user) {
            console.log("User not found.");
            // Step 1a: Check and delete matching chats if necessary
            await Chat.deleteMany({
                username: { $regex: new RegExp(`^${req.session.user.username}$`, "i") },
                email: { $regex: new RegExp(`^${req.session.user.email}$`, "i") }
            });
            console.log("Checked and deleted matching chats, if any.");
            // Render popup and redirect to logout
            console.log("User Not found and message deleted and redirected to login.");
            return res.render("popup.ejs", {
                message: {
                    m1: "User not found.",
                    m2: "You will be redirected to the Login page shortly."
                },
                redirectUrl: "/logout"
            });
        }
        const currentUser = req.session.user;
        console.log("User Found and render profile.");
        res.render("profile.ejs", { currentUser });
    }
    catch (err) {
        console.error("Error fetching chats:", err);
        return res.status(500).render("popup.ejs", {
            message: {
                m1: "An unexpected error occurred.",
                m2: "Please try again later."
            },
            redirectUrl: "/logout"
        });
    }
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
                    m1: "Validation failed.",
                    m2: "Please ensure all fields are correctly filled out."
                },
            });
        }
        let { name, email, username, password,otp } = req.body;
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
            // Validate the OTP
            const storedOtpData = otpStore[email];
            if (!storedOtpData || storedOtpData.otpExpiry < Date.now()) {
                return res.status(400).render("wrong.ejs", {
                    msg: {
                        m1: "Invalid or expired OTP.",
                        m2: "Please request a new OTP and try again."
                    },
                });
            }
            const isOtpValid = await bcrypt.compare(otp, storedOtpData.hashedOtp);
            if (!isOtpValid) {
                return res.status(400).render("wrong.ejs", {
                    msg: {
                        m1: "Invalid OTP.",
                        m2: "Please check the OTP and try again."
                    },
                });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ name, username, email, password: hashedPassword });
            await newUser.save();
            // Clear OTP from temporary store
            delete otpStore[email];
            console.log("Profile Cerated Redirected on chats page.");
            const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
            req.session.user = { name: user.name, username: user.username, email: user.email };
            return res.render("popup.ejs", {
                message: {
                    m1: "Welcome to DropNRead!",
                    m2: "A platform where you can leave a message for someone special by their name."
                },
                redirectUrl: "/chats/dashboard"
            });
        } catch (err) {
            console.error("Error during registration:", err);
            res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
        }
    }
);


const otpStore = {}; // Temporary store for OTPs

router.post("/send-otp-reg", async (req, res) => {
    let { email } = req.body;
    email = email.trim();
    try {
        // Generate OTP and expiry
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const otpExpiry = Date.now() + 5 * 60 * 1000; // Valid for 5 minutes
        // Hash the OTP
        const hashedOtp = await bcrypt.hash(otpCode, 10);
        // Store hashed OTP and expiry in the temporary store
        otpStore[email] = { hashedOtp, otpExpiry };
        // Send the plain OTP via email (using nodemailer)
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASS,
            },
        });
        await transporter.sendMail({
            from: `"DropNRead Support" <${process.env.EMAIL}>`,
            to: email,
            subject: "Your OTP for Registration",
            text: `Your OTP is ${otpCode}. It is valid for 5 minutes.`,
        });
        res.status(200).json({ msg: "OTP sent successfully. Please check your email." });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ msg: "Failed to send OTP. Please try again later." });
    }
});


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
                m1: "Validation failed.",
                m2: "Please ensure all fields are correctly filled out."
            }
        });
    }
    let { username, email, password, otp } = req.body;
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
        // Validate session existence and match details With current user
        let session = req.session.user;
        if (session) {
            // Check if the username or email does not match the current session user
            if (
                req.session.user.username.toLowerCase() !== username.toLowerCase() ||
                req.session.user.email.toLowerCase() !== email.toLowerCase()
            ) {
                console.log("User not matched to current session user.");
                return res.render("wrong.ejs", {
                    msg: {
                        m1: "Oops! User details do not match the current session user.",
                        m2: "Please verify the details and try again with the correct information."
                    }
                });
            }
        } else {
            console.log("No session found; skipping user check.");
        }
        // If matched, proceed further
        console.log("User matched successfully.");
        // Validate the OTP
        const storedOtpDataCurrent = otpStoreCurrent[email];
        if (!storedOtpDataCurrent || storedOtpDataCurrent.otpExpiry < Date.now()) {
            return res.status(400).render("wrong.ejs", {
                msg: {
                    m1: "Invalid or expired OTP.",
                    m2: "Please request a new OTP and try again."
                },
            });
        }
        const isOtpValid = await bcrypt.compare(otp, storedOtpDataCurrent.hashedOtp);
        if (!isOtpValid) {
            return res.status(400).render("wrong.ejs", {
                msg: {
                    m1: "Invalid OTP.",
                    m2: "Please check the OTP and try again."
                },
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
        // Update password and clear OTP
        user.password = await bcrypt.hash(password, 10);
        delete otpStore[email];
        await user.save();
        console.log(`Password reset successful for user: ${username}`);
        const fuser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!req.session.user) {
            req.session.user = { name: fuser.name, username: fuser.username, email: fuser.email };
        }
        return res.render("popup.ejs", {
            message: {
                m1: "Password reset successful",
                m2: "You will be redirected to the Chats shortly."
            },
            redirectUrl: "/chats/dashboard"
        });
    } catch (err) {
        console.error("Error resetting password:", err);
        res.status(500).render("wrongSingle.ejs", { msgs: "Oops! Internal Server Error." });
    }
});


// Route to generate OTP
const otpStoreCurrent = {}
router.post("/send-otp", async (req, res) => {
    let { email } = req.body;
    email = email.trim();
    try {
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!user) {
            return res.status(404).json({ msg: "No account found with this email address." });
        }
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        // Hash the OTP before saving
        const hashedOtp = await bcrypt.hash(otpCode, 10);
        otpStoreCurrent[email] = { hashedOtp, otpExpiry };
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASS,
            },
        });
        await transporter.sendMail({
            from: `"DropNRead Support" <${process.env.EMAIL}>`,
            to: email,
            subject: "Your OTP for Password Reset",
            text: `Your OTP is ${otpCode}. It is valid for 5 minutes.`,
        });
        res.status(200).json({ msg: "OTP sent successfully. Please check your email." });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ msg: "Failed to send OTP. Please try again later." });
    }
});



// Render Delete User Page
router.get("/deleteUser", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.session.user.username });
        if (!user) {
            console.log("User not found.");
            // Step 1a: Check and delete matching chats if necessary
            await Chat.deleteMany({
                username: { $regex: new RegExp(`^${req.session.user.username}$`, "i") },
                email: { $regex: new RegExp(`^${req.session.user.email}$`, "i") }
            });
            console.log("Checked and deleted matching chats, if any.");
            // Render popup and redirect to logout
            console.log("User Not found and message deleted and redirected to login.");
            return res.render("popup.ejs", {
                message: {
                    m1: "User not found.",
                    m2: "You will be redirected to the Login page shortly."
                },
                redirectUrl: "/logout"
            });
        }
        res.render("deleteUser")
    }
    catch (err) {
        console.error("Error fetching chats:", err);
        return res.status(500).render("popup.ejs", {
            message: {
                m1: "An unexpected error occurred.",
                m2: "Please try again later."
            },
            redirectUrl: "/logout"
        });
    }
});

// Handle User Deletion
router.delete("/deleteUser", isAuthenticated, async (req, res) => {
    let { username, name, email, password, otp } = req.body;
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
        const loginUser = await User.findOne({ username: req.session.user.username });
        if (!loginUser) {
            console.log("User not found.");
            // Step 1a: Check and delete matching chats if necessary
            await Chat.deleteMany({
                username: { $regex: new RegExp(`^${req.session.user.username}$`, "i") },
                email: { $regex: new RegExp(`^${req.session.user.email}$`, "i") }
            });
            console.log("Checked and deleted matching chats, if any.");
            // Render popup and redirect to logout
            console.log("User Not found and message deleted and redirected to login.");
            return res.render("popup.ejs", {
                message: {
                    m1: "User not found.",
                    m2: "You will be redirected to the Login page shortly."
                },
                redirectUrl: "/logout"
            });
        }
        // Validate session existence and match details with current session
        if (
            !req.session.user ||
            req.session.user.name.toLowerCase() !== name.toLowerCase() ||
            req.session.user.username.toLowerCase() !== username.toLowerCase() ||
            req.session.user.email.toLowerCase() !== email.toLowerCase()
        ) {
            console.log("User not matched to current session user.");
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! User details do not match the current session user.",
                    m2: "Please verify the details and try again with the correct information."
                }
            });
        }
        // If matched, proceed further
        console.log("User matched to session successfully.");
        if (!(await bcrypt.compare(password, user.password))) {
            console.log("Pasword not correct At delete Account.");
            return res.render("wrong.ejs", {
                msg: {
                    m1: "Oops! The details provided are incorrect.",
                    m2: "Please verify the details and try again with the correct information."
                }
            });
        }
        // Validate the OTP
        const storedOtpDataCurrent = otpStoreCurrent[email];
        if (!storedOtpDataCurrent || storedOtpDataCurrent.otpExpiry < Date.now()) {
            return res.status(400).render("wrong.ejs", {
                msg: {
                    m1: "Invalid or expired OTP.",
                    m2: "Please request a new OTP and try again."
                },
            });
        }
        const isOtpValid = await bcrypt.compare(otp, storedOtpDataCurrent.hashedOtp);
        if (!isOtpValid) {
            return res.status(400).render("wrong.ejs", {
                msg: {
                    m1: "Invalid OTP.",
                    m2: "Please check the OTP and try again."
                },
            });
        }
        await Chat.deleteMany({ username: username });
        console.log("All Chat is deleted of User.");
        await User.deleteOne({ _id: user._id });
        console.log("user Account deleted.");
        res.render("popup.ejs", {
            message:
            {
                m1: "Profile deleted successfully",
                m2: "You will be redirected to the Login page shortly."
            },
            redirectUrl: "/logout"
        });
    } catch (err) {
        console.error("Error deleting user:", err);
        return res.status(500).render("popup.ejs", {
            message: {
                m1: "An unexpected error occurred.",
                m2: "Please try again later."
            },
            redirectUrl: "/logout"
        });
    }
});


// Logout
router.get("/logout", (req, res) => {
    req.session = null;
    console.log("cookies deleted.");
    res.redirect("/login");
})


module.exports = router;