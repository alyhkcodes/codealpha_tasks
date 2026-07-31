require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const storyRoutes = require('./routes/stories');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Reuse the MongoDB connection across warm serverless invocations
let isConnected = false;

app.use(async (req, res, next) => {
  if (isConnected) return next();

  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);

app.get('/', (req, res) => {
  res.send('FUSE API is running');
});

module.exports = app;