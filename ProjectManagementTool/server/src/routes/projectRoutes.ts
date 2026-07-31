import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  getMembers,
  inviteMember,
  removeMember,
} from '../controllers/projectController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, createProject);
router.get('/', protect, getProjects);
router.get('/:id', protect, getProjectById);

router.get('/:id/members', protect, getMembers);
router.post('/:id/invite', protect, inviteMember);
router.delete('/:id/members/:memberId', protect, removeMember);

export default router;