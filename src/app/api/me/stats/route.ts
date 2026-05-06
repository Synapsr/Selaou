import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/stats?email=...
 *
 * Personal dashboard endpoint. Returns aggregated stats and recent activity
 * for the connected reviewer (identified by email — same lazy-auth model as
 * the rest of the app, no token required since the email is the secret).
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  try {
    const reviewer = await db.query.reviewers.findFirst({
      where: eq(schema.reviewers.email, email),
    });

    if (!reviewer) {
      return NextResponse.json({ error: "Reviewer not found" }, { status: 404 });
    }

    // Total annotated audio (sum of segment durations across all the user's reviews)
    const audioResult = await db
      .select({
        seconds: sql<string>`COALESCE(SUM(${schema.segments.endTime} - ${schema.segments.startTime}), 0)`,
      })
      .from(schema.reviews)
      .innerJoin(schema.segments, eq(schema.reviews.segmentId, schema.segments.id))
      .where(eq(schema.reviews.reviewerId, reviewer.id));

    const audioSeconds = parseFloat(audioResult[0]?.seconds || "0");

    // Activity heatmap — last 90 days, grouped by day
    const heatmapResult = await db
      .select({
        day: sql<string>`DATE(${schema.reviews.createdAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.reviews)
      .where(
        sql`${schema.reviews.reviewerId} = ${reviewer.id} AND ${schema.reviews.createdAt} >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`
      )
      .groupBy(sql`DATE(${schema.reviews.createdAt})`)
      .orderBy(sql`DATE(${schema.reviews.createdAt})`);

    const heatmap = heatmapResult.map((r) => ({
      day: typeof r.day === "string" ? r.day : new Date(r.day).toISOString().slice(0, 10),
      count: Number(r.count),
    }));

    // Active days (distinct days with at least one review)
    const activeDaysResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT DATE(${schema.reviews.createdAt}))`,
      })
      .from(schema.reviews)
      .where(eq(schema.reviews.reviewerId, reviewer.id));

    // Today's count for the header tracker
    const todayResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.reviews)
      .where(
        sql`${schema.reviews.reviewerId} = ${reviewer.id} AND DATE(${schema.reviews.createdAt}) = CURDATE()`
      );

    // Public rank (only for opted-in reviewers — silent if opted-out)
    let rank: number | null = null;
    if (reviewer.isPublic) {
      const rankResult = await db
        .select({
          higher: sql<number>`COUNT(*)`,
        })
        .from(schema.reviewers)
        .where(
          sql`${schema.reviewers.isPublic} = true AND ${schema.reviewers.reviewCount} > ${reviewer.reviewCount}`
        );
      rank = (Number(rankResult[0]?.higher) || 0) + 1;
    }

    // Last 5 reviews for activity feed
    const recentReviews = await db
      .select({
        id: schema.reviews.id,
        isCorrect: schema.reviews.isCorrect,
        createdAt: schema.reviews.createdAt,
        segmentText: schema.segments.text,
        sourceName: schema.audioSources.name,
      })
      .from(schema.reviews)
      .innerJoin(schema.segments, eq(schema.reviews.segmentId, schema.segments.id))
      .innerJoin(
        schema.audioSources,
        eq(schema.segments.audioSourceId, schema.audioSources.id)
      )
      .where(eq(schema.reviews.reviewerId, reviewer.id))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(5);

    return NextResponse.json({
      profile: {
        email: reviewer.email,
        displayName: reviewer.displayName,
        isPublic: reviewer.isPublic,
        memberSince: reviewer.createdAt,
        lastActiveAt: reviewer.lastReviewAt,
      },
      stats: {
        totalReviews: reviewer.reviewCount,
        totalCorrections: reviewer.correctionCount,
        audioSeconds,
        activeDays: Number(activeDaysResult[0]?.count) || 0,
        todayReviews: Number(todayResult[0]?.count) || 0,
        rank,
      },
      heatmap,
      recentReviews,
    });
  } catch (error) {
    console.error("Me stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
