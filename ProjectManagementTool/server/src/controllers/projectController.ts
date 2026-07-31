import { Request, Response } from 'express';
import Project from '../models/Project';
import Task from '../models/Task';
import User from '../models/User';

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = (req as any).userId;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = await Project.create({
      name,
      description: description || '',
      owner: userId,
      members: [userId],
    });

    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Attaches totalTasks/doneTasks to each project via a single aggregation
// query, rather than N+1 queries (one Task.count per project).
async function withTaskCounts(projects: any[]) {
  const projectIds = projects.map((p) => p._id);

  const counts = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: '$project',
        totalTasks: { $sum: 1 },
        doneTasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
      },
    },
  ]);

  const countsMap = new Map(counts.map((c) => [c._id.toString(), c]));

  return projects.map((p) => {
    const c = countsMap.get(p._id.toString());
    return {
      ...p.toObject(),
      totalTasks: c?.totalTasks ?? 0,
      doneTasks: c?.doneTasks ?? 0,
    };
  });
}

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const projects = await Project.find({ members: userId }).sort({ createdAt: -1 });
    const projectsWithCounts = await withTaskCounts(projects);
    res.status(200).json({ projects: projectsWithCounts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const project = await Project.findOne({ _id: req.params.id, members: userId });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const [withCounts] = await withTaskCounts([project]);
    res.status(200).json({ project: withCounts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// GET /api/projects/:id/members
// Returns member list populated with name/email, plus which member is the owner.
export const getMembers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const project = await Project.findOne({ _id: req.params.id, members: userId })
      .populate('members', 'name email')
      .populate('owner', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json({
      owner: project.owner,
      members: project.members,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// POST /api/projects/:id/invite  { email }
// Only the project owner can invite. The invited user must already have
// a NEST account — this does not send email invites to unregistered addresses.
export const inviteMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Only the project owner can invite members' });
    }

    const invitedUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!invitedUser) {
      return res.status(404).json({ message: 'No account found with that email' });
    }

    const alreadyMember = project.members.some(
      (m) => m.toString() === (invitedUser._id as any).toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ message: 'That user is already a member' });
    }

    project.members.push(invitedUser._id as any);
    await project.save();

    const populated = await project.populate('members', 'name email');

    res.status(200).json({ members: populated.members });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// DELETE /api/projects/:id/members/:memberId
// Only the owner can remove members. The owner cannot remove themselves this way.
export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { memberId } = req.params;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Only the project owner can remove members' });
    }

    if (project.owner.toString() === memberId) {
      return res.status(400).json({ message: 'The owner cannot be removed from the project' });
    }

    project.members = project.members.filter((m) => m.toString() !== memberId) as any;
    await project.save();

    const populated = await project.populate('members', 'name email');

    res.status(200).json({ members: populated.members });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};