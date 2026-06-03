import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role: 'admin' | 'member';
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
