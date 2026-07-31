const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// CREATE a post
router.post('/', auth, async (req, res) => {
  try {
    const { content, image } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    const post = new Post({ user: req.userId, content, image });
    await post.save();

    const populatedPost = await post.populate('user', 'username avatar');

    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all posts (global feed) - newest first
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar isPrivate followers')
      .populate('comments.user', 'username avatar');

    const visiblePosts = posts.filter(post => {
      const author = post.user;
      if (!author.isPrivate) return true;
      if (author._id.toString() === req.userId) return true;
      return author.followers.some(f => f.toString() === req.userId);
    });

    res.json(visiblePosts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// GET following feed (posts from users you follow)
router.get('/following', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    const posts = await Post.find({ user: { $in: currentUser.following } })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar');

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET posts by a specific user (for profile page)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.userId);

    if (!profileUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isOwnProfile = profileUser._id.toString() === req.userId;
    const isFollower = profileUser.followers.some(f => f.toString() === req.userId);

    if (profileUser.isPrivate && !isOwnProfile && !isFollower) {
      return res.status(403).json({ message: 'This account is private' });
    }

    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar');

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// LIKE / UNLIKE toggle
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const alreadyLiked = post.likes.includes(req.userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter(id => id.toString() !== req.userId);
    } else {
      post.likes.push(req.userId);
    }

    await post.save();

    res.json({ likes: post.likes, liked: !alreadyLiked });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ADD a comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({ user: req.userId, text });
    await post.save();

    const populatedPost = await post.populate('comments.user', 'username avatar');

    res.status(201).json(populatedPost.comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE a post (only by its owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await post.deleteOne();

    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;