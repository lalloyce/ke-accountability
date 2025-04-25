import mongoose, { Schema, Document } from 'mongoose';
import { Election as ElectionInterface } from './index';

export interface ElectionDocument extends ElectionInterface, Document {}

const ElectionSchema = new Schema<ElectionDocument>(
  {
    name: {
      type: String,
      required: [true, 'Please provide an election name'],
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Please provide an election date'],
    },
    type: {
      type: String,
      enum: ['presidential', 'parliamentary', 'county', 'other'],
      required: [true, 'Please provide an election type'],
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed'],
      default: 'upcoming',
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for uniqueness
ElectionSchema.index(
  { name: 1, date: 1, type: 1 },
  { unique: true }
);

// Prevent mongoose from creating a new model if it already exists
export default mongoose.models.Election ||
  mongoose.model<ElectionDocument>('Election', ElectionSchema);
