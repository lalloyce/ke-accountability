import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '../../lib/db';
import Election from '../../models/Election';

// GET - Retrieve all elections
export async function GET() {
  try {
    await dbConnect();
    const elections = await Election.find({}).sort({ date: -1 }); // Sort by date descending (newest first)

    return NextResponse.json({ elections }, { status: 200 });
  } catch (error) {
    console.error('Error fetching elections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch elections' },
      { status: 500 }
    );
  }
}

// POST - Create a new election
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

    // Check authorization (only admin role can create elections)
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create elections' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, date, type, status } = body;

    // Validate input
    if (!name || !date || !type) {
      return NextResponse.json(
        { error: 'Required fields: name, date, type' },
        { status: 400 }
      );
    }

    // Validate election type
    const validTypes = ['presidential', 'parliamentary', 'county', 'other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Election type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate election status if provided
    if (status) {
      const validStatuses = ['upcoming', 'ongoing', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Election status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Connect to database
    await dbConnect();

    // Check if election already exists
    const existingElection = await Election.findOne({
      name,
      date: new Date(date),
      type,
    });

    if (existingElection) {
      return NextResponse.json(
        { error: 'Election with this name, date, and type already exists' },
        { status: 409 }
      );
    }

    // Create new election
    const election = await Election.create({
      name,
      date: new Date(date),
      type,
      status: status || 'upcoming', // Default to 'upcoming' if not provided
    });

    // Return success response
    return NextResponse.json(
      {
        message: 'Election created successfully',
        election,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating election:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the election' },
      { status: 500 }
    );
  }
}
