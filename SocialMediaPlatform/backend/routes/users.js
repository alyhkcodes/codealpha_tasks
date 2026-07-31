const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// SEARCH users by username (must be registered BEFORE /:username,
// otherwise Express would treat "search" itself as a username)
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();

    if (!q) {
      return res.json([]);
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
    })
      .select('username avatar bio')
      .limit(10);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET pending follow requests for the logged-in user (must come before /:username)
router.get('/me/requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('followRequests', 'username avatar bio');

    res.json(user.followRequests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET a user's profile by username
router.get('/:username', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', 'username')
      .populate('following', 'username');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isOwnProfile = user._id.toString() === req.userId;
const isFollowing = user.followers.some(f => f._id.toString() === req.userId);
const requestPending = (user.followRequests || []).includes(req.userId);

    res.json({
      ...user.toObject(),
      isOwnProfile,
      isFollowing,
      requestPending,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE own profile (bio, avatar)
router.put('/me/update', auth, async (req, res) => {
  try {
    const { bio, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { bio, avatar } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// TOGGLE own account privacy (public <-> private)
router.put('/me/privacy', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.isPrivate = !user.isPrivate;
    await user.save();

    res.json({ isPrivate: user.isPrivate });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// FOLLOW / UNFOLLOW toggle — branches on privacy
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;

    if (targetId === req.userId) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    const targetUser = await User.findById(targetId);
    const currentUser = await User.findById(req.userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFollowing = targetUser.followers.includes(req.userId);
const requestPending = (targetUser.followRequests || []).includes(req.userId);

    // Already following -> this action always means "unfollow"
    if (isFollowing) {
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.userId);
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetId);

      await targetUser.save();
      await currentUser.save();

      return res.json({ following: false, requestPending: false });
    }

    // Already requested -> this action means "cancel request"
    if (requestPending) {
      targetUser.followRequests = (targetUser.followRequests || []).filter(id => id.toString() !== req.userId);
      await targetUser.save();

      return res.json({ following: false, requestPending: false });
    }
   // Not following, no pending request
    if (targetUser.isPrivate) {
      // Private account -> send a follow request instead of following directly
      targetUser.followRequests = targetUser.followRequests || [];
      targetUser.followRequests.push(req.userId);
      await targetUser.save();

      return res.json({ following: false, requestPending: true });
    } else {
      // Public account -> follow immediately, same as before
      targetUser.followers.push(req.userId);
      currentUser.following.push(targetId);

      await targetUser.save();
      await currentUser.save();

      return res.json({ following: true, requestPending: false });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ACCEPT a follow request
router.post('/requests/:id/accept', auth, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUser = await User.findById(req.userId);
    const requester = await User.findById(requesterId);

    if (!requester) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!currentUser.followRequests.includes(requesterId)) {
      return res.status(400).json({ message: 'No pending request from this user' });
    }

    currentUser.followRequests = currentUser.followRequests.filter(id => id.toString() !== requesterId);
    currentUser.followers.push(requesterId);
    requester.following.push(req.userId);

    await currentUser.save();
    await requester.save();

    res.json({ message: 'Follow request accepted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// REJECT a follow request
router.post('/requests/:id/reject', auth, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUser = await User.findById(req.userId);

    currentUser.followRequests = currentUser.followRequests.filter(id => id.toString() !== requesterId);
    await currentUser.save();

    res.json({ message: 'Follow request rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;