import express from 'express';
import {
  createTask,
  getTasksByProject,
  updateTaskStatus,
  updateTask,
  addComment,
  getActivityByProject,
} from '../controllers/taskController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, createTask);
router.get('/project/:projectId', protect, getTasksByProject);
router.get('/project/:projectId/activity', protect, getActivityByProject);
router.patch('/:id/status', protect, updateTaskStatus);
router.patch('/:id', protect, updateTask);
router.post('/:id/comments', protect, addComment);

export default router;