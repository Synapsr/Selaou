import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/admin";

type ExportType = "reviewers" | "reviews" | "segments" | "feedback" | "dataset" | "full";
type ExportFormat = "json" | "csv" | "jsonl";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const type = (url.searchParams.get("type") || "dataset") as ExportType;
    const format = (url.searchParams.get("format") || "json") as ExportFormat;

    let data: unknown;
    let filename: string;

    switch (type) {
      case "reviewers":
        data = await exportReviewers();
        filename = `selaou-reviewers-${getDateSuffix()}`;
        break;

      case "reviews":
        data = await exportReviews();
        filename = `selaou-reviews-${getDateSuffix()}`;
        break;

      case "segments":
        data = await exportSegments();
        filename = `selaou-segments-${getDateSuffix()}`;
        break;

      case "feedback":
        data = await exportFeedback();
        filename = `selaou-feedback-${getDateSuffix()}`;
        break;

      case "dataset":
        data = await exportDataset();
        filename = `selaou-dataset-${getDateSuffix()}`;
        break;

      case "full":
        data = await exportFull();
        filename = `selaou-full-export-${getDateSuffix()}`;
        break;

      default:
        return NextResponse.json({ error: "Type d'export invalide" }, { status: 400 });
    }

    // Format output
    let content: string;
    let contentType: string;

    switch (format) {
      case "csv":
        content = convertToCSV(data as Record<string, unknown>[]);
        contentType = "text/csv";
        filename += ".csv";
        break;

      case "jsonl":
        content = convertToJSONL(data as Record<string, unknown>[]);
        contentType = "application/jsonl";
        filename += ".jsonl";
        break;

      case "json":
      default:
        content = JSON.stringify(data, null, 2);
        contentType = "application/json";
        filename += ".json";
        break;
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}

function getDateSuffix(): string {
  return new Date().toISOString().split("T")[0];
}

async function exportReviewers() {
  return db
    .select({
      id: schema.reviewers.id,
      email: schema.reviewers.email,
      reviewCount: schema.reviewers.reviewCount,
      correctionCount: schema.reviewers.correctionCount,
      createdAt: schema.reviewers.createdAt,
      lastReviewAt: schema.reviewers.lastReviewAt,
    })
    .from(schema.reviewers)
    .orderBy(desc(schema.reviewers.reviewCount));
}

async function exportReviews() {
  return db
    .select({
      id: schema.reviews.id,
      segmentId: schema.reviews.segmentId,
      reviewerEmail: schema.reviewers.email,
      isCorrect: schema.reviews.isCorrect,
      correctedText: schema.reviews.correctedText,
      correctedWords: schema.reviews.correctedWords,
      createdAt: schema.reviews.createdAt,
      originalText: schema.segments.text,
      audioSourceName: schema.audioSources.name,
    })
    .from(schema.reviews)
    .leftJoin(schema.reviewers, eq(schema.reviews.reviewerId, schema.reviewers.id))
    .leftJoin(schema.segments, eq(schema.reviews.segmentId, schema.segments.id))
    .leftJoin(schema.audioSources, eq(schema.segments.audioSourceId, schema.audioSources.id))
    .orderBy(desc(schema.reviews.createdAt));
}

async function exportSegments() {
  return db
    .select({
      id: schema.segments.id,
      audioSourceId: schema.segments.audioSourceId,
      audioSourceName: schema.audioSources.name,
      audioUrl: schema.audioSources.audioUrl,
      segmentIndex: schema.segments.segmentIndex,
      startTime: schema.segments.startTime,
      endTime: schema.segments.endTime,
      text: schema.segments.text,
      confidence: schema.segments.confidence,
      reviewCount: schema.segments.reviewCount,
    })
    .from(schema.segments)
    .leftJoin(schema.audioSources, eq(schema.segments.audioSourceId, schema.audioSources.id))
    .orderBy(desc(schema.segments.reviewCount));
}

async function exportFeedback() {
  return db
    .select({
      id: schema.segmentFeedback.id,
      segmentId: schema.segmentFeedback.segmentId,
      reviewerEmail: schema.reviewers.email,
      type: schema.segmentFeedback.type,
      message: schema.segmentFeedback.message,
      createdAt: schema.segmentFeedback.createdAt,
      segmentText: schema.segments.text,
      audioSourceName: schema.audioSources.name,
    })
    .from(schema.segmentFeedback)
    .leftJoin(schema.reviewers, eq(schema.segmentFeedback.reviewerId, schema.reviewers.id))
    .leftJoin(schema.segments, eq(schema.segmentFeedback.segmentId, schema.segments.id))
    .leftJoin(schema.audioSources, eq(schema.segments.audioSourceId, schema.audioSources.id))
    .orderBy(desc(schema.segmentFeedback.createdAt));
}

async function exportDataset() {
  // Export optimisé pour l'entraînement IA (format HuggingFace)
  const segments = await db
    .select({
      segmentId: schema.segments.id,
      audioUrl: schema.audioSources.audioUrl,
      startTime: schema.segments.startTime,
      endTime: schema.segments.endTime,
      originalText: schema.segments.text,
      confidence: schema.segments.confidence,
      reviewCount: schema.segments.reviewCount,
    })
    .from(schema.segments)
    .leftJoin(schema.audioSources, eq(schema.segments.audioSourceId, schema.audioSources.id))
    .where(sql`${schema.segments.reviewCount} > 0`);

  const result = [];

  for (const segment of segments) {
    // Récupérer la dernière review pour ce segment
    const latestReview = await db
      .select({
        isCorrect: schema.reviews.isCorrect,
        correctedText: schema.reviews.correctedText,
      })
      .from(schema.reviews)
      .where(eq(schema.reviews.segmentId, segment.segmentId))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(1);

    const review = latestReview[0];
    const finalText = review?.isCorrect ? segment.originalText : (review?.correctedText || segment.originalText);

    result.push({
      audio: {
        path: segment.audioUrl,
        start: parseFloat(segment.startTime as string),
        end: parseFloat(segment.endTime as string),
      },
      text: finalText,
      original_text: segment.originalText,
      is_correction: review ? !review.isCorrect : false,
      confidence: parseFloat(segment.confidence as string),
      review_count: segment.reviewCount,
    });
  }

  return result;
}

async function exportFull() {
  const [reviewers, reviews, segments, feedback, audioSources] = await Promise.all([
    exportReviewers(),
    exportReviews(),
    exportSegments(),
    exportFeedback(),
    db.select({
      id: schema.audioSources.id,
      externalId: schema.audioSources.externalId,
      name: schema.audioSources.name,
      audioUrl: schema.audioSources.audioUrl,
      sourceUrl: schema.audioSources.sourceUrl,
      totalSegments: schema.audioSources.totalSegments,
      createdAt: schema.audioSources.createdAt,
    }).from(schema.audioSources),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    stats: {
      totalReviewers: reviewers.length,
      totalReviews: reviews.length,
      totalSegments: segments.length,
      totalFeedback: feedback.length,
      totalAudioSources: audioSources.length,
    },
    reviewers,
    reviews,
    segments,
    feedback,
    audioSources,
  };
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

function convertToJSONL(data: Record<string, unknown>[]): string {
  return data.map((row) => JSON.stringify(row)).join("\n");
}
