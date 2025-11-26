import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, gte, and, sql } from "drizzle-orm";
import type { ExportFormat, JsonlExportRow, CsvExportRow } from "@/types/export";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = (searchParams.get("format") || "jsonl") as ExportFormat;
  const onlyCorrections = searchParams.get("only_corrections") === "true";
  const minReviews = parseInt(searchParams.get("min_reviews") || "1", 10);

  try {
    // Build query conditions
    const conditions = [gte(schema.segments.reviewCount, minReviews)];

    // Get reviewed segments with their reviews
    const segments = await db
      .select({
        segmentId: schema.segments.id,
        segmentText: schema.segments.text,
        startTime: schema.segments.startTime,
        endTime: schema.segments.endTime,
        confidence: schema.segments.confidence,
        reviewCount: schema.segments.reviewCount,
        audioSourceId: schema.segments.audioSourceId,
        audioName: schema.audioSources.name,
        audioUrl: schema.audioSources.audioUrl,
      })
      .from(schema.segments)
      .innerJoin(
        schema.audioSources,
        eq(schema.segments.audioSourceId, schema.audioSources.id)
      )
      .where(and(...conditions));

    // Get reviews for these segments
    const segmentIds = segments.map((s) => s.segmentId);

    if (segmentIds.length === 0) {
      return new NextResponse("", {
        status: 200,
        headers: {
          "Content-Type": format === "csv" ? "text/csv" : "application/jsonl",
        },
      });
    }

    const reviews = await db
      .select()
      .from(schema.reviews)
      .where(sql`${schema.reviews.segmentId} IN (${sql.join(segmentIds.map(id => sql`${id}`), sql`, `)})`);

    // Group reviews by segment
    const reviewsBySegment = reviews.reduce(
      (acc, review) => {
        if (!acc[review.segmentId]) {
          acc[review.segmentId] = [];
        }
        acc[review.segmentId].push(review);
        return acc;
      },
      {} as Record<string, typeof reviews>
    );

    // Process segments
    const exportRows: (JsonlExportRow | CsvExportRow)[] = [];

    for (const segment of segments) {
      const segmentReviews = reviewsBySegment[segment.segmentId] || [];

      // Find the most recent correction or validation
      const corrections = segmentReviews.filter((r) => !r.isCorrect);
      const isCorrection = corrections.length > 0;

      if (onlyCorrections && !isCorrection) {
        continue;
      }

      // Use the most recent correction text, or original if validated
      const finalText = isCorrection
        ? corrections[corrections.length - 1].correctedText || segment.segmentText
        : segment.segmentText;

      if (format === "jsonl") {
        const row: JsonlExportRow = {
          audio: {
            path: segment.audioUrl,
            start: parseFloat(segment.startTime),
            end: parseFloat(segment.endTime),
          },
          text: finalText,
          original_text: segment.segmentText,
          is_correction: isCorrection,
          confidence: parseFloat(segment.confidence),
          review_count: segment.reviewCount,
        };
        exportRows.push(row);
      } else {
        const row: CsvExportRow = {
          audio_id: segment.audioSourceId,
          audio_url: segment.audioUrl,
          start_time: parseFloat(segment.startTime),
          end_time: parseFloat(segment.endTime),
          original_text: segment.segmentText,
          corrected_text: finalText,
          is_correction: isCorrection,
          confidence: parseFloat(segment.confidence),
          review_count: segment.reviewCount,
        };
        exportRows.push(row);
      }
    }

    // Format output
    if (format === "csv") {
      const headers = Object.keys(exportRows[0] || {}).join(",");
      const rows = exportRows.map((row) =>
        Object.values(row)
          .map((v) => (typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v))
          .join(",")
      );
      const csv = [headers, ...rows].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="selaou-export-${Date.now()}.csv"`,
        },
      });
    }

    // JSONL format
    const jsonl = exportRows.map((row) => JSON.stringify(row)).join("\n");

    return new NextResponse(jsonl, {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="selaou-export-${Date.now()}.jsonl"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
