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
    username: {
        type: String,
        required: [true, 'Username is required.']
    },
    dropdownValue: {
        type: String,
        required: [true, 'Dropdown value is required.'],
        enum: ['Name', 'Email', 'Username'], 
    },
    email: {
        type: String,
        required: [true, 'Email is required.']
    },
    message: {
        type: String,
        required: [true, 'Message is required.'],
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
