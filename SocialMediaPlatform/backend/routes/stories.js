const express = require('express');
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// CREATE a story
router.post('/', auth, async (req, res) => {
  try {
    const { text, image } = req.body;

    if (!text?.trim() && !image) {
      return res.status(400).json({ message: 'Story needs text or an image' });
    }

    const story = new Story({
      author: req.userId,
      text: text ? text.trim() : '',
      image: image || null,
    });

    await story.save();

    const populated = await story.populate('author', 'username avatar');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET active stories from people you follow + yourself, grouped by author
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    const authorIds = [...user.following, req.userId];

    const stories = await Story.find({ author: { $in: authorIds } })
      .sort({ createdAt: 1 })
      .populate('author', 'username avatar');

    // Group into one entry per author, newest-first ordering of authors
    const grouped = new Map();

    stories.forEach((story) => {
      const authorId = story.author._id.toString();
      if (!grouped.has(authorId)) {
        grouped.set(authorId, {
          author: { _id: story.author._id, username: story.author.username, avatar: story.author.avatar },
          stories: [],
        });
      }
      grouped.get(authorId).stories.push({
        _id: story._id,
        text: story.text,
        image: story.image,
        createdAt: story.createdAt,
      });
    });

    // Put your own stories first, then most-recently-posted-to groups
    const result = Array.from(grouped.values()).sort((a, b) => {
      if (a.author._id.toString() === req.userId) return -1;
      if (b.author._id.toString() === req.userId) return 1;
      const aLatest = a.stories[a.stories.length - 1].createdAt;
      const bLatest = b.stories[b.stories.length - 1].createdAt;
      return new Date(bLatest) - new Date(aLatest);
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE a story (only by its author)
router.delete('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    await story.deleteOne();

    res.json({ message: 'Story deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;