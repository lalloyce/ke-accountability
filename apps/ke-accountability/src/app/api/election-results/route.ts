import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '../../lib/db';
import ElectionResult from '../../models/ElectionResult';
import Election from '../../models/Election';
import PollingStation from '../../models/PollingStation';

// GET - Retrieve all election results
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get query parameters
    const url = new URL(req.url);
    const electionId = url.searchParams.get('electionId');
    const pollingStationId = url.searchParams.get('pollingStationId');
    const status = url.searchParams.get('status');

    // Build query
    const query: any = {};
    if (electionId) query.electionId = electionId;
    if (pollingStationId) query.pollingStationId = pollingStationId;
    if (status) query.status = status;

    // Fetch results with populated references
    const results = await ElectionResult.find(query)
      .populate('electionId', 'name date type')
      .populate('pollingStationId', 'name location constituency ward')
      .populate('uploadedById', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Error fetching election results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch election results' },
      { status: 500 }
    );
  }
}

// POST - Upload a new election result
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      electionId,
      pollingStationId,
      candidates,
      totalVotes,
      rejectedVotes,
      spoiltVotes
    } = body;

    // Validate input
    if (!electionId || !pollingStationId || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: 'Required fields: electionId, pollingStationId, candidates (array)' },
        { status: 400 }
      );
    }

    if (typeof totalVotes !== 'number' || typeof rejectedVotes !== 'number' || typeof spoiltVotes !== 'number') {
      return NextResponse.json(
        { error: 'totalVotes, rejectedVotes, and spoiltVotes must be numbers' },
        { status: 400 }
      );
    }

    // Validate candidates
    for (const candidate of candidates) {
      if (!candidate.id || !candidate.name || !candidate.party || typeof candidate.votes !== 'number') {
        return NextResponse.json(
          { error: 'Each candidate must have id, name, party, and votes (number)' },
          { status: 400 }
        );
      }
    }

    // Connect to database
    await dbConnect();

    // Verify election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Verify polling station exists
    const pollingStation = await PollingStation.findById(pollingStationId);
    if (!pollingStation) {
      return NextResponse.json(
        { error: 'Polling station not found' },
        { status: 404 }
      );
    }

    // Check if result already exists for this election and polling station
    const existingResult = await ElectionResult.findOne({
      electionId,
      pollingStationId,
    });

    if (existingResult) {
      return NextResponse.json(
        { error: 'Result already exists for this election and polling station' },
        { status: 409 }
      );
    }

    // Validate vote counts
    const candidateVotesSum = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
    const validVotes = totalVotes - (rejectedVotes + spoiltVotes);

    if (candidateVotesSum !== validVotes) {
      return NextResponse.json(
        {
          error: 'Sum of candidate votes must equal total votes minus rejected and spoilt votes',
          candidateVotesSum,
          validVotes,
          totalVotes,
          rejectedVotes,
          spoiltVotes
        },
        { status: 400 }
      );
    }

    // Create new election result
    const result = await ElectionResult.create({
      electionId,
      pollingStationId,
      uploadedById: session.user.id,
      candidates,
      totalVotes,
      rejectedVotes,
      spoiltVotes,
      status: 'pending', // All new results start as pending
    });

    // Return success response
    return NextResponse.json(
      {
        message: 'Election result uploaded successfully',
        result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading election result:', error);
    return NextResponse.json(
      { error: 'An error occurred while uploading the election result' },
      { status: 500 }
    );
  }
}
