import mongoose, { Schema, Document } from 'mongoose';
import { LedgerEntry as LedgerEntryInterface } from './index';
import { createHash } from 'crypto';

export interface LedgerEntryDocument extends LedgerEntryInterface, Document {}

const LedgerEntrySchema = new Schema<LedgerEntryDocument>(
  {
    resultId: {
      type: Schema.Types.ObjectId,
      ref: 'ElectionResult',
      required: [true, 'Please provide an election result ID'],
      unique: true,
    },
    verifications: [{
      type: Schema.Types.ObjectId,
      ref: 'Verification',
      required: [true, 'Please provide verification IDs'],
    }],
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true, // Once set, cannot be modified
    },
    hash: {
      type: String,
      required: true,
      immutable: true, // Once set, cannot be modified
    },
    previousHash: {
      type: String,
      required: true,
      immutable: true, // Once set, cannot be modified
    },
  },
  {
    // Disable the ability to modify documents after creation
    timestamps: {
      createdAt: true,
      updatedAt: false, // Disable updatedAt field
    },
  }
);

// Prevent any updates to ledger entries
LedgerEntrySchema.pre('findOneAndUpdate', function(next) {
  const error = new Error('Ledger entries cannot be modified once created');
  next(error);
});

LedgerEntrySchema.pre('updateOne', function(next) {
  const error = new Error('Ledger entries cannot be modified once created');
  next(error);
});

LedgerEntrySchema.pre('updateMany', function(next) {
  const error = new Error('Ledger entries cannot be modified once created');
  next(error);
});

// Generate hash before saving
LedgerEntrySchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Get the latest ledger entry to get the previous hash
      const latestEntry = await mongoose.model('LedgerEntry').findOne().sort({ timestamp: -1 });

      // If this is the first entry, use a genesis hash
      this.previousHash = latestEntry ? latestEntry.hash : 'genesis-block-hash';

      // Create a hash of the current entry
      const dataToHash = JSON.stringify({
        resultId: this.resultId,
        verifications: this.verifications,
        timestamp: this.timestamp,
        previousHash: this.previousHash,
      });

      this.hash = createHash('sha256').update(dataToHash).digest('hex');
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    const error = new Error('Ledger entries cannot be modified once created');
    next(error);
  }
});

// Add a static method to verify the integrity of the ledger
LedgerEntrySchema.statics.verifyLedgerIntegrity = async function() {
  const entries = await this.find().sort({ timestamp: 1 });

  if (entries.length === 0) {
    return true; // Empty ledger is valid
  }

  // Check each entry's hash against a recalculated hash
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Verify previous hash (except for first entry)
    if (i > 0) {
      if (entry.previousHash !== entries[i - 1].hash) {
        return false;
      }
    } else {
      // First entry should have the genesis hash
      if (entry.previousHash !== 'genesis-block-hash') {
        return false;
      }
    }

    // Verify current hash
    const dataToHash = JSON.stringify({
      resultId: entry.resultId,
      verifications: entry.verifications,
      timestamp: entry.timestamp,
      previousHash: entry.previousHash,
    });

    const calculatedHash = createHash('sha256').update(dataToHash).digest('hex');

    if (calculatedHash !== entry.hash) {
      return false;
    }
  }

  return true;
};

// Prevent mongoose from creating a new model if it already exists
export default mongoose.models.LedgerEntry ||
  mongoose.model<LedgerEntryDocument>('LedgerEntry', LedgerEntrySchema);
