import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Period = "week" | "month" | "all";

const PERIOD_DAYS: Record<Period, number | null> = {
  week: 7,
  month: 30,
  all: null,
};

const LEADERBOARD_LIMIT = 50;

/**
 * GET /api/leaderboard?period=week|month|all&email=...
 *
 * Public ranking of opted-in contributors. Counts reviews within the period
 * and the audio duration covered by them. The optional `email` parameter
 * locates the connected reviewer's row even when they fall outside the top N.
 */
export async function GET(request: NextRequest) {
  const periodParam = (request.nextUrl.searchParams.get("period") || "all") as Period;
  const period: Period = ["week", "month", "all"].includes(periodParam) ? periodParam : "all";
  const email = request.nextUrl.searchParams.get("email");

  try {
    const days = PERIOD_DAYS[period];
    const periodFilter = days
      ? sql`AND ${schema.reviews.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`
      : sql``;

    // Top contributors for the period
    const top = await db
      .select({
        reviewerId: schema.reviewers.id,
        displayName: schema.reviewers.displayName,
        memberSince: schema.reviewers.createdAt,
        reviewCount: sql<number>`COUNT(${schema.reviews.id})`,
        correctionCount: sql<number>`SUM(CASE WHEN ${schema.reviews.isCorrect} = false THEN 1 ELSE 0 END)`,
        audioSeconds: sql<string>`COALESCE(SUM(${schema.segments.endTime} - ${schema.segments.startTime}), 0)`,
      })
      .from(schema.reviewers)
      .innerJoin(schema.reviews, eq(schema.reviews.reviewerId, schema.reviewers.id))
      .innerJoin(schema.segments, eq(schema.segments.id, schema.reviews.segmentId))
      .where(sql`${schema.reviewers.isPublic} = true ${periodFilter}`)
      .groupBy(schema.reviewers.id, schema.reviewers.displayName, schema.reviewers.createdAt)
      .orderBy(desc(sql`COUNT(${schema.reviews.id})`))
      .limit(LEADERBOARD_LIMIT);

    const ranked = top.map((row, idx) => ({
      rank: idx + 1,
      displayName: row.displayName ?? "Annotateur",
      memberSince: row.memberSince,
      reviewCount: Number(row.reviewCount),
      correctionCount: Number(row.correctionCount),
      audioSeconds: parseFloat(row.audioSeconds || "0"),
      isCurrentUser: false as boolean,
    }));

    // Global aggregates for the period header (no public filter — represent
    // the whole community effort, not just opted-in contributors)
    const globalAgg = await db
      .select({
        contributors: sql<number>`COUNT(DISTINCT ${schema.reviews.reviewerId})`,
        reviews: sql<number>`COUNT(${schema.reviews.id})`,
        corrections: sql<number>`SUM(CASE WHEN ${schema.reviews.isCorrect} = false THEN 1 ELSE 0 END)`,
        audioSeconds: sql<string>`COALESCE(SUM(${schema.segments.endTime} - ${schema.segments.startTime}), 0)`,
      })
      .from(schema.reviews)
      .innerJoin(schema.segments, eq(schema.segments.id, schema.reviews.segmentId))
      .where(days ? sql`${schema.reviews.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)` : sql`1=1`);

    // Locate the current user's row (when not in top N) so the UI can render
    // a sticky "you are #X" line under the leaderboard
    let currentUser: {
      rank: number;
      displayName: string;
      reviewCount: number;
      correctionCount: number;
      audioSeconds: number;
      isPublic: boolean;
    } | null = null;

    if (email) {
      const reviewer = await db.query.reviewers.findFirst({
        where: eq(schema.reviewers.email, email),
        columns: { id: true, displayName: true, isPublic: true },
      });

      if (reviewer) {
        const inTopIndex = top.findIndex((r) => r.reviewerId === reviewer.id);
        if (inTopIndex >= 0) {
          ranked[inTopIndex].isCurrentUser = true;
          const me = ranked[inTopIndex];
          currentUser = {
            rank: me.rank,
            displayName: me.displayName,
            reviewCount: me.reviewCount,
            correctionCount: me.correctionCount,
            audioSeconds: me.audioSeconds,
            isPublic: reviewer.isPublic,
          };
        } else {
          // Compute their stats for the period and rank against opted-in users
          const myStats = await db
            .select({
              reviewCount: sql<number>`COUNT(${schema.reviews.id})`,
              correctionCount: sql<number>`SUM(CASE WHEN ${schema.reviews.isCorrect} = false THEN 1 ELSE 0 END)`,
              audioSeconds: sql<string>`COALESCE(SUM(${schema.segments.endTime} - ${schema.segments.startTime}), 0)`,
            })
            .from(schema.reviews)
            .innerJoin(schema.segments, eq(schema.segments.id, schema.reviews.segmentId))
            .where(sql`${schema.reviews.reviewerId} = ${reviewer.id} ${periodFilter}`);

          const myCount = Number(myStats[0]?.reviewCount || 0);

          if (myCount > 0 && reviewer.isPublic) {
            // Count opted-in reviewers with strictly more reviews in the period.
            // The inner aggregate is bounded by the number of distinct opted-in
            // reviewers (not the number of reviews), so it stays cheap on the
            // current scale. Revisit (cache or materialized view) if the
            // contributor base grows past a few thousand.
            const ahead = await db
              .select({
                count: sql<number>`COUNT(*)`,
              })
              .from(
                sql`(
                  SELECT r.reviewer_id, COUNT(*) AS rc
                  FROM reviews r
                  INNER JOIN reviewers rv ON rv.id = r.reviewer_id
                  WHERE rv.is_public = true
                    ${days ? sql`AND r.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)` : sql``}
                  GROUP BY r.reviewer_id
                  HAVING rc > ${myCount}
                ) AS ranked_ahead`
              );
            const aheadCount = Number(ahead[0]?.count || 0);

            currentUser = {
              rank: aheadCount + 1,
              displayName: reviewer.displayName ?? "Annotateur",
              reviewCount: myCount,
              correctionCount: Number(myStats[0]?.correctionCount || 0),
              audioSeconds: parseFloat(myStats[0]?.audioSeconds || "0"),
              isPublic: reviewer.isPublic,
            };
          } else {
            currentUser = {
              rank: 0,
              displayName: reviewer.displayName ?? "Annotateur",
              reviewCount: myCount,
              correctionCount: Number(myStats[0]?.correctionCount || 0),
              audioSeconds: parseFloat(myStats[0]?.audioSeconds || "0"),
              isPublic: reviewer.isPublic,
            };
          }
        }
      }
    }

    return NextResponse.json({
      period,
      leaderboard: ranked,
      global: {
        contributors: Number(globalAgg[0]?.contributors || 0),
        reviews: Number(globalAgg[0]?.reviews || 0),
        corrections: Number(globalAgg[0]?.corrections || 0),
        audioSeconds: parseFloat(globalAgg[0]?.audioSeconds || "0"),
      },
      currentUser,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
