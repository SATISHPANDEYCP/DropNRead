// Creating Our models
const mongoose = require("mongoose");

// Schema definition
const chatSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    username:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        required: true,
        default: () => moment().tz('Asia/Kolkata').toDate()
    }
});

// Model creation
const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
