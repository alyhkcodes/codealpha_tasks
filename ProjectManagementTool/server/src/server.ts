import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import { initSocket } from './socket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NEST server is running' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Socket.io needs to attach to the raw http.Server, not the Express app
// directly, so requests and websocket upgrades can share the same port.
const httpServer = createServer(app);
initSocket(httpServer);

// Connect to MongoDB, then start server
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 NEST server running on http://localhost:${PORT}`);
  });
});