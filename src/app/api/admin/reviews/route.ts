import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/admin";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const segmentId = url.searchParams.get("segmentId");
    const reviewerId = url.searchParams.get("reviewerId");

    let query = db
      .select({
        id: schema.reviews.id,
        segmentId: schema.reviews.segmentId,
        reviewerId: schema.reviews.reviewerId,
        isCorrect: schema.reviews.isCorrect,
        correctedText: schema.reviews.correctedText,
        correctedWords: schema.reviews.correctedWords,
        createdAt: schema.reviews.createdAt,
        reviewerEmail: schema.reviewers.email,
        segmentText: schema.segments.text,
        audioSourceName: schema.audioSources.name,
      })
      .from(schema.reviews)
      .leftJoin(schema.reviewers, eq(schema.reviews.reviewerId, schema.reviewers.id))
      .leftJoin(schema.segments, eq(schema.reviews.segmentId, schema.segments.id))
      .leftJoin(schema.audioSources, eq(schema.segments.audioSourceId, schema.audioSources.id))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(limit)
      .offset(offset);

    if (segmentId) {
      query = query.where(eq(schema.reviews.segmentId, segmentId)) as typeof query;
    }
    if (reviewerId) {
      query = query.where(eq(schema.reviews.reviewerId, reviewerId)) as typeof query;
    }

    const reviewsList = await query;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.reviews);

    return NextResponse.json({
      reviews: reviewsList,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des annotations" },
      { status: 500 }
    );
  }
}
