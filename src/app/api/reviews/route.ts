import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { ReviewSubmission } from "@/types/review";

export async function POST(request: NextRequest) {
  try {
    const body: ReviewSubmission = await request.json();
    const { segmentId, reviewerEmail, isCorrect, correctedText, correctedWords } = body;

    // Validate required fields
    if (!segmentId || !reviewerEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get reviewer
    const reviewer = await db.query.reviewers.findFirst({
      where: eq(schema.reviewers.email, reviewerEmail),
    });

    if (!reviewer) {
      return NextResponse.json({ error: "Reviewer not found" }, { status: 404 });
    }

    // Check if segment exists
    const segment = await db.query.segments.findFirst({
      where: eq(schema.segments.id, segmentId),
    });

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    // Create review
    const reviewId = uuid();
    await db.insert(schema.reviews).values({
      id: reviewId,
      segmentId,
      reviewerId: reviewer.id,
      isCorrect,
      correctedText: isCorrect ? null : correctedText,
      correctedWords: isCorrect ? null : correctedWords,
    });

    // Update segment review count
    await db
      .update(schema.segments)
      .set({
        reviewCount: sql`${schema.segments.reviewCount} + 1`,
      })
      .where(eq(schema.segments.id, segmentId));

    // Update reviewer stats
    await db
      .update(schema.reviewers)
      .set({
        reviewCount: sql`${schema.reviewers.reviewCount} + 1`,
        correctionCount: isCorrect
          ? sql`${schema.reviewers.correctionCount}`
          : sql`${schema.reviewers.correctionCount} + 1`,
        lastReviewAt: new Date(),
      })
      .where(eq(schema.reviewers.id, reviewer.id));

    return NextResponse.json({
      success: true,
      reviewId,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
