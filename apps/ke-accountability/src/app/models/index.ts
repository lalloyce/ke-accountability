// Database models for the Kenya Accountability system

// User model
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'verifier' | 'uploader';
  createdAt: Date;
  updatedAt: Date;
}

// Polling Station model
export interface PollingStation {
  id: string;
  name: string;
  location: string;
  region: string;
  constituency: string;
  ward: string;
  createdAt: Date;
  updatedAt: Date;
}

// Election model
export interface Election {
  id: string;
  name: string;
  date: Date;
  type: 'presidential' | 'parliamentary' | 'county' | 'other';
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// Election Result model
export interface ElectionResult {
  id: string;
  electionId: string;
  pollingStationId: string;
  uploadedById: string;
  candidates: Candidate[];
  totalVotes: number;
  rejectedVotes: number;
  spoiltVotes: number;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

// Candidate model
export interface Candidate {
  id: string;
  name: string;
  party: string;
  votes: number;
}

// Verification model
export interface Verification {
  id: string;
  resultId: string;
  verifierId: string;
  status: 'approved' | 'rejected';
  comments: string;
  createdAt: Date;
}

// Ledger Entry model (for verified results)
export interface LedgerEntry {
  id: string;
  resultId: string;
  verifications: string[]; // Array of verification IDs
  timestamp: Date;
  hash: string; // For blockchain integration
  previousHash: string; // For blockchain integration
}
