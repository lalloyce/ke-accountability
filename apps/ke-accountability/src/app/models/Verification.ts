import mongoose, { Schema, Document } from 'mongoose';
import { Verification as VerificationInterface } from './index';

export interface VerificationDocument extends VerificationInterface, Document {}

const VerificationSchema = new Schema<VerificationDocument>(
  {
    resultId: {
      type: Schema.Types.ObjectId,
      ref: 'ElectionResult',
      required: [true, 'Please provide an election result ID'],
    },
    verifierId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a verifier ID'],
    },
    status: {
      type: String,
      enum: ['approved', 'rejected'],
      required: [true, 'Please provide a verification status'],
    },
    comments: {
      type: String,
      required: [true, 'Please provide verification comments'],
      minlength: [10, 'Comments must be at least 10 characters'],
      maxlength: [1000, 'Comments cannot be more than 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Create a compound index for uniqueness (one verification per user per result)
VerificationSchema.index(
  { resultId: 1, verifierId: 1 },
  { unique: true }
);

// Add a static method to count verifications for a result
VerificationSchema.statics.countVerifications = async function(resultId: string) {
  const approvedCount = await this.countDocuments({ resultId, status: 'approved' });
  const rejectedCount = await this.countDocuments({ resultId, status: 'rejected' });
  return { approved: approvedCount, rejected: rejectedCount, total: approvedCount + rejectedCount };
};

// Add a static method to check if a result has enough verifications to be finalized
VerificationSchema.statics.isVerificationComplete = async function(resultId: string) {
  const counts = await this.countVerifications(resultId);
  // Require at least 5 verifications to finalize
  return counts.total >= 5;
};

// Add a static method to determine the final verification status
VerificationSchema.statics.getFinalStatus = async function(resultId: string) {
  const counts = await this.countVerifications(resultId);
  if (counts.total < 5) {
    return 'pending';
  }
  return counts.approved > counts.rejected ? 'verified' : 'rejected';
};

// Prevent mongoose from creating a new model if it already exists
export default mongoose.models.Verification ||
  mongoose.model<VerificationDocument>('Verification', VerificationSchema);
