import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, gt } from "drizzle-orm";

export async function GET() {
  try {
    // Total segments
    const totalSegmentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.segments);

    // Reviewed segments (at least one review)
    const reviewedSegmentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.segments)
      .where(gt(schema.segments.reviewCount, 0));

    // Total reviews
    const totalReviewsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.reviews);

    // Corrections (reviews where isCorrect = false)
    const correctionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.reviews)
      .where(sql`${schema.reviews.isCorrect} = false`);

    // Unique reviewers
    const uniqueReviewersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.reviewers);

    // Audio sources
    const audioSourcesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.audioSources);

    return NextResponse.json({
      totalSegments: totalSegmentsResult[0]?.count || 0,
      reviewedSegments: reviewedSegmentsResult[0]?.count || 0,
      totalReviews: totalReviewsResult[0]?.count || 0,
      totalCorrections: correctionsResult[0]?.count || 0,
      uniqueReviewers: uniqueReviewersResult[0]?.count || 0,
      audioSources: audioSourcesResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
