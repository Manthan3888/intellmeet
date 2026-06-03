import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee?: Types.ObjectId;
  assigneeName?: string;
  projectId: Types.ObjectId;
  meetingId?: Types.ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    assigneeName: { type: String },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Task = mongoose.model<ITask>('Task', taskSchema);

export interface IProject extends Document {
  name: string;
  description?: string;
  teamId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>('Project', projectSchema);

export interface ITeamMember {
  userId: Types.ObjectId;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface ITeam extends Document {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  members: ITeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [teamMemberSchema],
  },
  { timestamps: true }
);

export const Team = mongoose.model<ITeam>('Team', teamSchema);

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: 'mention' | 'action_item' | 'meeting' | 'task';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['mention', 'action_item', 'meeting', 'task'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
