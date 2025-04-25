import mongoose, { Schema, Document } from 'mongoose';
import { ElectionResult as ElectionResultInterface, Candidate } from './index';

export interface ElectionResultDocument extends ElectionResultInterface, Document {}

const CandidateSchema = new Schema<Candidate>({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a candidate name'],
    maxlength: [100, 'Name cannot be more than 100 characters'],
  },
  party: {
    type: String,
    required: [true, 'Please provide a party name'],
    maxlength: [100, 'Party name cannot be more than 100 characters'],
  },
  votes: {
    type: Number,
    required: [true, 'Please provide the number of votes'],
    min: [0, 'Votes cannot be negative'],
  },
});

const ElectionResultSchema = new Schema<ElectionResultDocument>(
  {
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      required: [true, 'Please provide an election ID'],
    },
    pollingStationId: {
      type: Schema.Types.ObjectId,
      ref: 'PollingStation',
      required: [true, 'Please provide a polling station ID'],
    },
    uploadedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a user ID'],
    },
    candidates: {
      type: [CandidateSchema],
      required: [true, 'Please provide candidate information'],
      validate: {
        validator: function(candidates: Candidate[]) {
          return candidates.length > 0;
        },
        message: 'At least one candidate must be provided',
      },
    },
    totalVotes: {
      type: Number,
      required: [true, 'Please provide the total number of votes'],
      min: [0, 'Total votes cannot be negative'],
    },
    rejectedVotes: {
      type: Number,
      required: [true, 'Please provide the number of rejected votes'],
      min: [0, 'Rejected votes cannot be negative'],
    },
    spoiltVotes: {
      type: Number,
      required: [true, 'Please provide the number of spoilt votes'],
      min: [0, 'Spoilt votes cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for uniqueness
ElectionResultSchema.index(
  { electionId: 1, pollingStationId: 1 },
  { unique: true }
);

// Validate that the sum of candidate votes equals totalVotes - (rejectedVotes + spoiltVotes)
ElectionResultSchema.pre('save', function(next) {
  const candidateVotesSum = this.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
  const validVotes = this.totalVotes - (this.rejectedVotes + this.spoiltVotes);

  if (candidateVotesSum !== validVotes) {
    return next(new Error('Sum of candidate votes must equal total votes minus rejected and spoilt votes'));
  }

  next();
});

// Prevent mongoose from creating a new model if it already exists
export default mongoose.models.ElectionResult ||
  mongoose.model<ElectionResultDocument>('ElectionResult', ElectionResultSchema);
