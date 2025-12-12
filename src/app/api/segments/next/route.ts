import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql, and, notExists, lt, gte, lte } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const UNCERTAINTY_WEIGHT = parseFloat(
  process.env.SELECTION_UNCERTAINTY_WEIGHT || "0.7"
);
const MAX_REVIEWS = parseInt(process.env.SELECTION_MAX_REVIEWS || "3", 10);

// Minimum segment quality thresholds
const MIN_SEGMENT_DURATION = 2.0; // seconds
const MIN_TEXT_LENGTH = 10; // characters

// For anonymous users, target medium confidence for better first impression
const ANONYMOUS_MIN_CONFIDENCE = 0.5;
const ANONYMOUS_MAX_CONFIDENCE = 0.9;

// Mode-based confidence thresholds
const EASY_MIN_CONFIDENCE = 0.85;
const CHALLENGE_MAX_CONFIDENCE = 0.7;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");
  const random = searchParams.get("random") === "true";
  const mode = searchParams.get("mode") || "mixed"; // "mixed" | "easy" | "challenge"

  try {
    // Get or create reviewer (only if email provided)
    let reviewer: { id: string; email: string; reviewCount: number; correctionCount: number } | null = null;

    if (email) {
      const existingReviewer = await db.query.reviewers.findFirst({
        where: eq(schema.reviewers.email, email),
      });

      if (!existingReviewer) {
        const id = uuid();
        await db.insert(schema.reviewers).values({
          id,
          email,
        });
        reviewer = { id, email, reviewCount: 0, correctionCount: 0 };
      } else {
        reviewer = existingReviewer;
      }
    }

    // Select next segment
    // For anonymous users: use random selection with medium confidence for better first impression
    // For authenticated users: prioritize uncertain segments
    // If random=true (skip): use pure random selection
    const isAnonymous = !reviewer;

    let orderClause;
    if (random) {
      orderClause = sql`RAND()`;
    } else if (isAnonymous) {
      // For anonymous users, just use random within the filtered confidence range
      orderClause = sql`RAND()`;
    } else if (mode === "challenge") {
      // For challenge mode, prioritize most uncertain segments
      orderClause = sql`((1 - ${schema.segments.confidence}) * ${UNCERTAINTY_WEIGHT} + RAND() * ${1 - UNCERTAINTY_WEIGHT}) DESC`;
    } else {
      // For easy and mixed modes, use random selection (filtering handles the rest)
      orderClause = sql`RAND()`;
    }

    // Build where conditions
    const whereConditions = [
      lt(schema.segments.reviewCount, MAX_REVIEWS),
      // Minimum segment duration (endTime - startTime >= MIN_SEGMENT_DURATION)
      sql`(${schema.segments.endTime} - ${schema.segments.startTime}) >= ${MIN_SEGMENT_DURATION}`,
      // Minimum text length
      sql`CHAR_LENGTH(${schema.segments.text}) >= ${MIN_TEXT_LENGTH}`,
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
    ];

    // Apply confidence filtering based on mode and authentication status
    if (isAnonymous) {
      // For anonymous users, filter to medium confidence range for better first impression
      whereConditions.push(
        gte(schema.segments.confidence, String(ANONYMOUS_MIN_CONFIDENCE)),
        lte(schema.segments.confidence, String(ANONYMOUS_MAX_CONFIDENCE))
      );
    } else {
      // For authenticated users, apply mode-based filtering
      if (mode === "easy") {
        // High confidence segments only
        whereConditions.push(
          gte(schema.segments.confidence, String(EASY_MIN_CONFIDENCE))
        );
      } else if (mode === "challenge") {
        // Low confidence segments only
        whereConditions.push(
          lt(schema.segments.confidence, String(CHALLENGE_MAX_CONFIDENCE))
        );
      }
      // "mixed" mode: no additional confidence filtering
    }

    // Only exclude already-reviewed segments if user is authenticated
    if (reviewer) {
      whereConditions.push(
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
        )
      );
    }

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
      .where(and(...whereConditions))
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
          totalReviews: reviewer?.reviewCount || 0,
          totalCorrections: reviewer?.correctionCount || 0,
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
        totalReviews: reviewer?.reviewCount || 0,
        totalCorrections: reviewer?.correctionCount || 0,
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
