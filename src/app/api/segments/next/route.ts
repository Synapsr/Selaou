import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql, and, notExists, lt } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const UNCERTAINTY_WEIGHT = parseFloat(
  process.env.SELECTION_UNCERTAINTY_WEIGHT || "0.7"
);
const MAX_REVIEWS = parseInt(process.env.SELECTION_MAX_REVIEWS || "3", 10);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");
  const random = searchParams.get("random") === "true";

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    // Get or create reviewer
    let reviewer = await db.query.reviewers.findFirst({
      where: eq(schema.reviewers.email, email),
    });

    if (!reviewer) {
      const id = uuid();
      await db.insert(schema.reviewers).values({
        id,
        email,
      });
      reviewer = { id, email, reviewCount: 0, correctionCount: 0, createdAt: new Date(), lastReviewAt: null };
    }

    // Select next segment
    // If random=true, use pure random selection (useful after skip)
    // Otherwise, use weighted selection: Priority = (1 - confidence) * weight + random * (1 - weight)
    const orderClause = random
      ? sql`RAND()`
      : sql`((1 - ${schema.segments.confidence}) * ${UNCERTAINTY_WEIGHT} + RAND() * ${1 - UNCERTAINTY_WEIGHT}) DESC`;

    const segments = await db
      .select({
        id: schema.segments.id,
        audioSourceId: schema.segments.audioSourceId,
        segmentIndex: schema.segments.segmentIndex,
        startTime: schema.segments.startTime,
        endTime: schema.segments.endTime,
        text: schema.segments.text,
        confidence: schema.segments.confidence,
        reviewCount: schema.segments.reviewCount,
      })
      .from(schema.segments)
      .where(
        and(
          lt(schema.segments.reviewCount, MAX_REVIEWS),
          // Exclude segments already reviewed by this user
          notExists(
            db
              .select({ one: sql`1` })
              .from(schema.reviews)
              .where(
                and(
                  eq(schema.reviews.segmentId, schema.segments.id),
                  eq(schema.reviews.reviewerId, reviewer.id)
                )
              )
          ),
          // Exclude segments with audio_issue alerts
          notExists(
            db
              .select({ one: sql`1` })
              .from(schema.segmentFeedback)
              .where(
                and(
                  eq(schema.segmentFeedback.segmentId, schema.segments.id),
                  eq(schema.segmentFeedback.type, "audio_issue")
                )
              )
          )
        )
      )
      .orderBy(orderClause)
      .limit(1);

    if (segments.length === 0) {
      // Count remaining segments for stats
      const remainingResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.segments)
        .where(lt(schema.segments.reviewCount, MAX_REVIEWS));

      return NextResponse.json({
        segment: null,
        stats: {
          totalReviews: reviewer.reviewCount,
          totalCorrections: reviewer.correctionCount,
          remainingSegments: remainingResult[0]?.count || 0,
        },
      });
    }

    const segment = segments[0];

    // Get audio source info
    const audioSource = await db.query.audioSources.findFirst({
      where: eq(schema.audioSources.id, segment.audioSourceId),
      columns: {
        id: true,
        name: true,
        audioUrl: true,
        sourceUrl: true,
        whisperData: true,
      },
    });

    if (!audioSource) {
      return NextResponse.json(
        { error: "Audio source not found" },
        { status: 404 }
      );
    }

    // Extract words for this segment from whisper data
    const whisperData = audioSource.whisperData as {
      segments?: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
        words?: Array<{ word: string; start: number; end: number; probability: number }>;
      }>;
    };

    const whisperSegment = whisperData?.segments?.find(
      (s) => s.id === segment.segmentIndex
    );

    // Count remaining segments
    const remainingResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.segments)
      .where(lt(schema.segments.reviewCount, MAX_REVIEWS));

    return NextResponse.json({
      segment: {
        ...segment,
        whisperWords: whisperSegment?.words || null,
        audioSource: {
          id: audioSource.id,
          name: audioSource.name,
          audioUrl: audioSource.audioUrl,
          sourceUrl: audioSource.sourceUrl,
        },
      },
      stats: {
        totalReviews: reviewer.reviewCount,
        totalCorrections: reviewer.correctionCount,
        remainingSegments: remainingResult[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching segment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
