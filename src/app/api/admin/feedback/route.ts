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
    const type = url.searchParams.get("type"); // 'audio_issue' | 'remark'

    let query = db
      .select({
        id: schema.segmentFeedback.id,
        segmentId: schema.segmentFeedback.segmentId,
        reviewerId: schema.segmentFeedback.reviewerId,
        type: schema.segmentFeedback.type,
        message: schema.segmentFeedback.message,
        createdAt: schema.segmentFeedback.createdAt,
        reviewerEmail: schema.reviewers.email,
        segmentText: schema.segments.text,
        audioSourceName: schema.audioSources.name,
        audioSourceId: schema.audioSources.id,
      })
      .from(schema.segmentFeedback)
      .leftJoin(schema.reviewers, eq(schema.segmentFeedback.reviewerId, schema.reviewers.id))
      .leftJoin(schema.segments, eq(schema.segmentFeedback.segmentId, schema.segments.id))
      .leftJoin(schema.audioSources, eq(schema.segments.audioSourceId, schema.audioSources.id))
      .orderBy(desc(schema.segmentFeedback.createdAt))
      .limit(limit)
      .offset(offset);

    if (type) {
      query = query.where(eq(schema.segmentFeedback.type, type)) as typeof query;
    }

    const feedbackList = await query;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.segmentFeedback);

    // Compte par type
    const typeCounts = await db
      .select({
        type: schema.segmentFeedback.type,
        count: sql<number>`count(*)`,
      })
      .from(schema.segmentFeedback)
      .groupBy(schema.segmentFeedback.type);

    return NextResponse.json({
      feedback: feedbackList,
      total: count,
      typeCounts: typeCounts.reduce(
        (acc, { type, count }) => ({ ...acc, [type]: count }),
        {} as Record<string, number>
      ),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des remarques" },
      { status: 500 }
    );
  }
}
