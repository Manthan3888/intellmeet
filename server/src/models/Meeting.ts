import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IActionItem {
  _id?: Types.ObjectId;
  text: string;
  assignee?: Types.ObjectId;
  assigneeName?: string;
  completed: boolean;
  dueDate?: Date;
}

export interface IChatMessage {
  userId: Types.ObjectId;
  userName: string;
  message: string;
  timestamp: Date;
}

export interface IMeeting extends Document {
  title: string;
  description?: string;
  hostId: Types.ObjectId;
  hostName: string;
  roomCode: string;
  status: 'scheduled' | 'live' | 'ended';
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  participants: Types.ObjectId[];
  transcript: string;
  summary?: string;
  actionItems: IActionItem[];
  chatMessages: IChatMessage[];
  sharedNotes: string;
  recordingUrl?: string;
  durationMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const actionItemSchema = new Schema<IActionItem>(
  {
    text: { type: String, required: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    assigneeName: { type: String },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
  },
  { _id: true }
);

const chatMessageSchema = new Schema<IChatMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const meetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hostName: { type: String, required: true },
    roomCode: { type: String, required: true, unique: true, uppercase: true },
    status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    transcript: { type: String, default: '' },
    summary: { type: String },
    actionItems: [actionItemSchema],
    chatMessages: [chatMessageSchema],
    sharedNotes: { type: String, default: '' },
    recordingUrl: { type: String },
    durationMinutes: { type: Number },
  },
  { timestamps: true }
);

meetingSchema.index({ hostId: 1, createdAt: -1 });
meetingSchema.index({ participants: 1 });

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
