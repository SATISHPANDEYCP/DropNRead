// Creating Our models
const mongoose = require("mongoose");

// Schema definition
const chatSchema = new mongoose.Schema({
    from: {
        type: String,
        required: [true, 'From is required.']
    },
    to: {
        type: String,
        required: [true, 'To is required.']
    },
    username:{
        type: String,
        required: [true, 'Username is required.']
    },
    email:{
        type: String,
        required: [true, 'Email is required.']
    },
    message: {
        type: String,
        required: [true, 'Message is required.'],
        maxLength: [1000, 'Message cannot exceed 1,000 characters.']
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now()
    }
});

// Model creation
const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
