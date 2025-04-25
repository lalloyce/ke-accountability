import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '../../lib/db';
import LedgerEntry from '../../models/LedgerEntry';

// GET - Retrieve ledger entries
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get query parameters
    const url = new URL(req.url);
    const resultId = url.searchParams.get('resultId');
    const verifyIntegrity = url.searchParams.get('verifyIntegrity') === 'true';

    // Build query
    const query: any = {};
    if (resultId) query.resultId = resultId;

    // Fetch ledger entries with populated references
    const ledgerEntries = await LedgerEntry.find(query)
      .populate({
        path: 'resultId',
        populate: [
          { path: 'electionId', select: 'name date type' },
          { path: 'pollingStationId', select: 'name location constituency ward' },
          { path: 'uploadedById', select: 'name email' }
        ]
      })
      .populate({
        path: 'verifications',
        populate: { path: 'verifierId', select: 'name email' }
      })
      .sort({ timestamp: -1 });

    // Verify ledger integrity if requested
    let isLedgerValid = null;
    if (verifyIntegrity) {
      isLedgerValid = await LedgerEntry.verifyLedgerIntegrity();
    }

    const response: any = { ledgerEntries };

    if (verifyIntegrity) {
      response.ledgerIntegrity = {
        verified: isLedgerValid,
        message: isLedgerValid
          ? 'Ledger integrity verified successfully'
          : 'Ledger integrity verification failed'
      };
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}

// POST - Not allowed for ledger (immutable)
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Ledger entries can only be created through the verification process' },
    { status: 405 }
  );
}

// PUT - Not allowed for ledger (immutable)
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Ledger entries cannot be modified' },
    { status: 405 }
  );
}

// DELETE - Not allowed for ledger (immutable)
export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Ledger entries cannot be deleted' },
    { status: 405 }
  );
}
