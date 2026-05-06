import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview
 *
 * Aggregated KPIs powering the admin dashboard header. Combines counters that
 * each tab would otherwise have to compute on its own.
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const [reviewers] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        active7d: sql<number>`SUM(CASE WHEN ${schema.reviewers.lastReviewAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END)`,
      })
      .from(schema.reviewers);

    const [reviews] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        corrections: sql<number>`SUM(CASE WHEN ${schema.reviews.isCorrect} = false THEN 1 ELSE 0 END)`,
        last24h: sql<number>`SUM(CASE WHEN ${schema.reviews.createdAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END)`,
      })
      .from(schema.reviews);

    const [segments] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        reviewed: sql<number>`SUM(CASE WHEN ${schema.segments.reviewCount} > 0 THEN 1 ELSE 0 END)`,
        audioSeconds: sql<string>`COALESCE(SUM(${schema.segments.endTime} - ${schema.segments.startTime}), 0)`,
        annotatedSeconds: sql<string>`COALESCE(SUM(CASE WHEN ${schema.segments.reviewCount} > 0 THEN (${schema.segments.endTime} - ${schema.segments.startTime}) ELSE 0 END), 0)`,
      })
      .from(schema.segments);

    const [feedback] = await db
      .select({
        audioIssues: sql<number>`SUM(CASE WHEN ${schema.segmentFeedback.type} = 'audio_issue' THEN 1 ELSE 0 END)`,
        remarks: sql<number>`SUM(CASE WHEN ${schema.segmentFeedback.type} = 'remark' THEN 1 ELSE 0 END)`,
      })
      .from(schema.segmentFeedback);

    return NextResponse.json({
      reviewers: {
        total: Number(reviewers?.total) || 0,
        active7d: Number(reviewers?.active7d) || 0,
      },
      reviews: {
        total: Number(reviews?.total) || 0,
        corrections: Number(reviews?.corrections) || 0,
        last24h: Number(reviews?.last24h) || 0,
      },
      segments: {
        total: Number(segments?.total) || 0,
        reviewed: Number(segments?.reviewed) || 0,
        audioSeconds: parseFloat(segments?.audioSeconds || "0"),
        annotatedSeconds: parseFloat(segments?.annotatedSeconds || "0"),
      },
      feedback: {
        audioIssues: Number(feedback?.audioIssues) || 0,
        remarks: Number(feedback?.remarks) || 0,
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
