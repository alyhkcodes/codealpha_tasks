const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    maxlength: 300,
    default: ''
  },
  image: {
    type: String, // base64 data URL, e.g. "data:image/jpeg;base64,..."
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // TTL: MongoDB auto-deletes 24h after createdAt
  }
});

module.exports = mongoose.model('Story', storySchema);