import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, asc, eq, sql } from "drizzle-orm";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/admin";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const sortBy = url.searchParams.get("sort") || "reviewCount";
    const order = url.searchParams.get("order") || "desc";
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const audioSourceId = url.searchParams.get("audioSourceId");
    const minReviews = parseInt(url.searchParams.get("minReviews") || "0");

    const orderColumn =
      sortBy === "confidence"
        ? schema.segments.confidence
        : sortBy === "startTime"
          ? schema.segments.startTime
          : schema.segments.reviewCount;

    const conditions = [];
    if (audioSourceId) {
      conditions.push(eq(schema.segments.audioSourceId, audioSourceId));
    }
    if (minReviews > 0) {
      conditions.push(sql`${schema.segments.reviewCount} >= ${minReviews}`);
    }

    let query = db
      .select({
        id: schema.segments.id,
        audioSourceId: schema.segments.audioSourceId,
        segmentIndex: schema.segments.segmentIndex,
        startTime: schema.segments.startTime,
        endTime: schema.segments.endTime,
        text: schema.segments.text,
        confidence: schema.segments.confidence,
        reviewCount: schema.segments.reviewCount,
        audioSourceName: schema.audioSources.name,
        audioUrl: schema.audioSources.audioUrl,
      })
      .from(schema.segments)
      .leftJoin(schema.audioSources, eq(schema.segments.audioSourceId, schema.audioSources.id))
      .orderBy(order === "asc" ? asc(orderColumn) : desc(orderColumn))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      for (const condition of conditions) {
        query = query.where(condition) as typeof query;
      }
    }

    const segmentsList = await query;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.segments);

    return NextResponse.json({
      segments: segmentsList,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching segments:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des segments" },
      { status: 500 }
    );
  }
}
