import mongoose, { Schema, Document } from 'mongoose';
import { User as UserInterface } from './index';

export interface UserDocument extends UserInterface, Document {
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['admin', 'verifier', 'uploader'],
      default: 'uploader',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Prevent mongoose from creating a new model if it already exists
export default mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
