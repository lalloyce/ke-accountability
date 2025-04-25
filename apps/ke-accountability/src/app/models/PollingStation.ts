import mongoose, { Schema, Document } from 'mongoose';
import { PollingStation as PollingStationInterface } from './index';

export interface PollingStationDocument extends PollingStationInterface, Document {}

const PollingStationSchema = new Schema<PollingStationDocument>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a polling station name'],
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    location: {
      type: String,
      required: [true, 'Please provide a location'],
      maxlength: [200, 'Location cannot be more than 200 characters'],
    },
    region: {
      type: String,
      required: [true, 'Please provide a region'],
      maxlength: [100, 'Region cannot be more than 100 characters'],
    },
    constituency: {
      type: String,
      required: [true, 'Please provide a constituency'],
      maxlength: [100, 'Constituency cannot be more than 100 characters'],
    },
    ward: {
      type: String,
      required: [true, 'Please provide a ward'],
      maxlength: [100, 'Ward cannot be more than 100 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for uniqueness
PollingStationSchema.index(
  { name: 1, constituency: 1, ward: 1 },
  { unique: true }
);

// Prevent mongoose from creating a new model if it already exists
export default mongoose.models.PollingStation ||
  mongoose.model<PollingStationDocument>('PollingStation', PollingStationSchema);
