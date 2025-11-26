import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segmentId, reviewerEmail, type, message } = body;

    if (!segmentId || !reviewerEmail || !type) {
      return NextResponse.json(
        { error: "Missing required fields: segmentId, reviewerEmail, type" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["audio_issue", "remark"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Get or create reviewer
    let reviewer = await db.query.reviewers.findFirst({
      where: eq(schema.reviewers.email, reviewerEmail),
    });

    if (!reviewer) {
      const id = uuid();
      await db.insert(schema.reviewers).values({
        id,
        email: reviewerEmail,
      });
      reviewer = { id, email: reviewerEmail, reviewCount: 0, correctionCount: 0, createdAt: new Date(), lastReviewAt: null };
    }

    // Create feedback
    const feedbackId = uuid();
    await db.insert(schema.segmentFeedback).values({
      id: feedbackId,
      segmentId,
      reviewerId: reviewer.id,
      type,
      message: message || null,
    });

    return NextResponse.json({
      success: true,
      feedbackId,
    });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
