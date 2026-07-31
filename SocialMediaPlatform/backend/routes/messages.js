const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// SEND a message
router.post('/', auth, async (req, res) => {
  try {
    const { username, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const recipient = await User.findOne({ username });

    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (recipient._id.toString() === req.userId) {
      return res.status(400).json({ message: "You can't message yourself" });
    }

    const message = new Message({
      sender: req.userId,
      recipient: recipient._id,
      text: text.trim(),
    });

    await message.save();

    const populated = await message.populate('sender', 'username avatar');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET inbox — one row per conversation, most recent message first
router.get('/', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.userId }, { recipient: req.userId }],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar');

    // Collapse into one entry per conversation partner, keeping only the latest message
    const conversations = new Map();

    messages.forEach((msg) => {
      const isSender = msg.sender._id.toString() === req.userId;
      const partner = isSender ? msg.recipient : msg.sender;

      if (!conversations.has(partner._id.toString())) {
        conversations.set(partner._id.toString(), {
          partner: { _id: partner._id, username: partner.username, avatar: partner.avatar },
          lastMessage: msg.text,
          lastAt: msg.createdAt,
          unread: !isSender && !msg.read,
        });
      }
    });

    res.json(Array.from(conversations.values()));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET full conversation with a specific user (by username)
router.get('/:username', auth, async (req, res) => {
  try {
    const partner = await User.findOne({ username: req.params.username });

    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: partner._id },
        { sender: partner._id, recipient: req.userId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatar');

    // Mark messages from partner -> me as read
    await Message.updateMany(
      { sender: partner._id, recipient: req.userId, read: false },
      { $set: { read: true } }
    );

    res.json({
      partner: { _id: partner._id, username: partner.username, avatar: partner.avatar },
      messages,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE an entire conversation with a specific user (by username)
router.delete('/conversation/:username', auth, async (req, res) => {
  try {
    const partner = await User.findOne({ username: req.params.username });

    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Message.deleteMany({
      $or: [
        { sender: req.userId, recipient: partner._id },
        { sender: partner._id, recipient: req.userId },
      ],
    });

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE a message (only by its sender)
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await message.deleteOne();

    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;