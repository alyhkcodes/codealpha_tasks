import mongoose, { Schema, Document } from 'mongoose';

export type ActivityAction =
  | 'task_created'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'comment_added';

export interface IActivityLog extends Document {
  project: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  action: ActivityAction;
  // Freeform details specific to the action, e.g. { from: 'todo', to: 'done' }
  // or { title } for creation. Kept loose so we don't need a schema migration
  // every time a new action type wants to carry different fields.
  meta: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: ['task_created', 'status_changed', 'priority_changed', 'due_date_changed', 'comment_added'],
      required: true,
    },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Most common query is "recent activity for a project", newest first.
activityLogSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);