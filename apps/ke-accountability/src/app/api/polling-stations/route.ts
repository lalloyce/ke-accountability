import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '../../lib/db';
import PollingStation from '../../models/PollingStation';

// GET - Retrieve all polling stations
export async function GET() {
  try {
    await dbConnect();
    const pollingStations = await PollingStation.find({}).sort({ name: 1 });

    return NextResponse.json({ pollingStations }, { status: 200 });
  } catch (error) {
    console.error('Error fetching polling stations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch polling stations' },
      { status: 500 }
    );
  }
}

// POST - Create a new polling station
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

    // Check authorization (only admin and verifier roles can create polling stations)
    if (session.user.role !== 'admin' && session.user.role !== 'verifier') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and verifiers can create polling stations' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, location, region, constituency, ward } = body;

    // Validate input
    if (!name || !location || !region || !constituency || !ward) {
      return NextResponse.json(
        { error: 'All fields are required: name, location, region, constituency, ward' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Check if polling station already exists
    const existingStation = await PollingStation.findOne({
      name,
      constituency,
      ward,
    });

    if (existingStation) {
      return NextResponse.json(
        { error: 'Polling station with this name already exists in this constituency and ward' },
        { status: 409 }
      );
    }

    // Create new polling station
    const pollingStation = await PollingStation.create({
      name,
      location,
      region,
      constituency,
      ward,
    });

    // Return success response
    return NextResponse.json(
      {
        message: 'Polling station created successfully',
        pollingStation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating polling station:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the polling station' },
      { status: 500 }
    );
  }
}
