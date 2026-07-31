import { Request, Response } from 'express';
import Task from '../models/Task';
import Project from '../models/Project';
import ActivityLog from '../models/ActivityLog';
import { emitTaskCreated, emitTaskUpdated, emitTaskCommentAdded } from '../socket';

// Fire-and-forget logger. Activity logging should never be the reason a
// task mutation fails, so errors here are swallowed (and logged server-side)
// rather than bubbled up to the response.
const logActivity = async (entry: {
  project: string;
  task: string;
  user: string;
  action: 'task_created' | 'status_changed' | 'priority_changed' | 'due_date_changed' | 'comment_added';
  meta?: Record<string, unknown>;
}) => {
  try {
    await ActivityLog.create({ ...entry, meta: entry.meta ?? {} });
  } catch (error) {
    console.error('Failed to write activity log:', (error as Error).message);
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, projectId, priority, dueDate } = req.body;
    const userId = (req as any).userId;

    if (!title || !projectId) {
      return res.status(400).json({ message: 'Title and projectId are required' });
    }

    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }

    const project = await Project.findOne({ _id: projectId, members: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      project: projectId,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    await logActivity({
      project: projectId,
      task: String(task._id),
      user: userId,
      action: 'task_created',
      meta: { title },
    });

    emitTaskCreated(projectId, task);

    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getTasksByProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;

    const project = await Project.findOne({ _id: projectId, members: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const tasks = await Task.find({ project: projectId }).sort({ createdAt: -1 });
    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const userId = (req as any).userId;

    if (!['todo', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const existing = await Task.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const previousStatus = existing.status;

    const task = await Task.findByIdAndUpdate(id, { status }, { new: true });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (previousStatus !== status) {
      await logActivity({
        project: String(task.project),
        task: String(task._id),
        user: userId,
        action: 'status_changed',
        meta: { from: previousStatus, to: status },
      });
    }

    emitTaskUpdated(String(task.project), task);

    res.status(200).json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Generic edit endpoint for fields set after creation — currently priority
// and dueDate. Kept separate from updateTaskStatus so drag-and-drop status
// updates stay a single, minimal PATCH and don't risk clobbering other
// fields with stale client state.
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { priority, dueDate } = req.body;
    const userId = (req as any).userId;

    const existing = await Task.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const update: { priority?: string; dueDate?: Date | null } = {};

    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }
      update.priority = priority;
    }

    if (dueDate !== undefined) {
      update.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const task = await Task.findByIdAndUpdate(id, update, { new: true });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (update.priority !== undefined && update.priority !== existing.priority) {
      await logActivity({
        project: String(task.project),
        task: String(task._id),
        user: userId,
        action: 'priority_changed',
        meta: { from: existing.priority, to: update.priority },
      });
    }

    if (update.dueDate !== undefined) {
      const prevDue = existing.dueDate ? existing.dueDate.toISOString() : null;
      const nextDue = update.dueDate ? update.dueDate.toISOString() : null;
      if (prevDue !== nextDue) {
        await logActivity({
          project: String(task.project),
          task: String(task._id),
          user: userId,
          action: 'due_date_changed',
          meta: { from: prevDue, to: nextDue },
        });
      }
    }

    if (update.priority !== undefined || update.dueDate !== undefined) {
      emitTaskUpdated(String(task.project), task);
    }

    res.status(200).json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const { id } = req.params;
    const userId = (req as any).userId;

    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.comments.push({ user: userId, text, createdAt: new Date() });
    await task.save();

    await logActivity({
      project: String(task.project),
      task: String(task._id),
      user: userId,
      action: 'comment_added',
      meta: { text },
    });

    const populated = await task.populate('comments.user', 'name email');
    emitTaskCommentAdded(String(task.project), populated);
    res.status(200).json({ task: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// New: activity feed for a project, newest first. Populates the acting
// user's name/email and the task's title so the frontend can render a
// feed line like "Ada changed 'Fix login bug' to done" without a second
// round trip per entry.
export const getActivityByProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const project = await Project.findOne({ _id: projectId, members: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const activity = await ActivityLog.find({ project: projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name email')
      .populate('task', 'title');

    res.status(200).json({ activity });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};