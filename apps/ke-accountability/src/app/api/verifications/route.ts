import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '../../lib/db';
import Verification from '../../models/Verification';
import ElectionResult from '../../models/ElectionResult';
import LedgerEntry from '../../models/LedgerEntry';

// GET - Retrieve verifications for a result
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get query parameters
    const url = new URL(req.url);
    const resultId = url.searchParams.get('resultId');

    if (!resultId) {
      return NextResponse.json(
        { error: 'resultId query parameter is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the result to check its status
    const result = await ElectionResult.findById(resultId);
    if (!result) {
      return NextResponse.json(
        { error: 'Election result not found' },
        { status: 404 }
      );
    }

    // Get verification count
    const counts = await Verification.countDocuments({ resultId });

    // If verification is not complete, only return count
    if (counts < 5 && result.status === 'pending') {
      return NextResponse.json({
        message: 'Verification in progress',
        count: counts,
        isComplete: false,
        // Don't return individual verifications until complete
      }, { status: 200 });
    }

    // If verification is complete or user is admin, return all verifications
    const verifications = await Verification.find({ resultId })
      .populate('verifierId', 'name email')
      .sort({ createdAt: 1 });

    return NextResponse.json({
      verifications,
      count: verifications.length,
      isComplete: verifications.length >= 5 || result.status !== 'pending',
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching verifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}

// POST - Submit a verification
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

    // Check authorization (only verifier and admin roles can verify results)
    if (session.user.role !== 'admin' && session.user.role !== 'verifier') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and verifiers can verify results' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { resultId, status, comments } = body;

    // Validate input
    if (!resultId || !status || !comments) {
      return NextResponse.json(
        { error: 'Required fields: resultId, status, comments' },
        { status: 400 }
      );
    }

    // Validate status
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json(
        { error: 'Status must be either "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Validate comments
    if (comments.length < 10) {
      return NextResponse.json(
        { error: 'Comments must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Check if result exists
    const result = await ElectionResult.findById(resultId);
    if (!result) {
      return NextResponse.json(
        { error: 'Election result not found' },
        { status: 404 }
      );
    }

    // Check if result is already verified or rejected
    if (result.status !== 'pending') {
      return NextResponse.json(
        { error: 'This result has already been finalized and cannot be verified' },
        { status: 400 }
      );
    }

    // Check if user has already verified this result
    const existingVerification = await Verification.findOne({
      resultId,
      verifierId: session.user.id,
    });

    if (existingVerification) {
      return NextResponse.json(
        { error: 'You have already verified this result' },
        { status: 409 }
      );
    }

    // Create new verification
    const verification = await Verification.create({
      resultId,
      verifierId: session.user.id,
      status,
      comments,
    });

    // Check if we have enough verifications to finalize the result
    const isComplete = await Verification.isVerificationComplete(resultId);

    if (isComplete) {
      // Get the final status
      const finalStatus = await Verification.getFinalStatus(resultId);

      // Update the result status
      await ElectionResult.findByIdAndUpdate(resultId, { status: finalStatus });

      // If approved, create a ledger entry
      if (finalStatus === 'verified') {
        // Get all verifications for this result
        const verifications = await Verification.find({ resultId });
        const verificationIds = verifications.map(v => v._id);

        // Create ledger entry
        await LedgerEntry.create({
          resultId,
          verifications: verificationIds,
        });
      }
    }

    // Return success response
    return NextResponse.json(
      {
        message: 'Verification submitted successfully',
        verification,
        isComplete,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting verification:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting the verification' },
      { status: 500 }
    );
  }
}
