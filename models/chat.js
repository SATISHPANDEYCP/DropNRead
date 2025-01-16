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
        required: false
    },
    message: {
        type: String,
        required: false
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    }
});

// Model creation
const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
