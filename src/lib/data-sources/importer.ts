import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { DataSourceAdapter, AudioInput } from "./types";
import { calculateSegmentConfidence } from "@/types/whisper";

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importFromAdapter(
  adapter: DataSourceAdapter
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  try {
    await adapter.connect();
    const sources = await adapter.fetchSources();

    for (const source of sources) {
      try {
        await importAudioSource(source);
        result.imported++;
      } catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
          result.skipped++;
        } else {
          result.errors.push(
            `${source.externalId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }
  } finally {
    await adapter.disconnect();
  }

  return result;
}

export async function importAudioSource(source: AudioInput): Promise<string> {
  // Check if already imported
  const existing = await db.query.audioSources.findFirst({
    where: eq(schema.audioSources.externalId, source.externalId),
  });

  if (existing) {
    throw new Error(`Source ${source.externalId} already exists`);
  }

  const audioSourceId = uuid();

  // Insert audio source
  await db.insert(schema.audioSources).values({
    id: audioSourceId,
    externalId: source.externalId,
    name: source.name,
    audioUrl: source.audioUrl,
    sourceUrl: source.sourceUrl,
    whisperData: source.whisperJson,
    totalSegments: source.whisperJson.segments.length,
  });

  // Insert segments
  const segmentValues = source.whisperJson.segments.map((segment) => ({
    id: uuid(),
    audioSourceId,
    segmentIndex: segment.id,
    startTime: segment.start.toFixed(3),
    endTime: segment.end.toFixed(3),
    text: segment.text.trim(),
    confidence: calculateSegmentConfidence(segment).toFixed(4),
    reviewCount: 0,
  }));

  if (segmentValues.length > 0) {
    // Batch insert in chunks to avoid query size limits
    const chunkSize = 100;
    for (let i = 0; i < segmentValues.length; i += chunkSize) {
      const chunk = segmentValues.slice(i, i + chunkSize);
      await db.insert(schema.segments).values(chunk);
    }
  }

  return audioSourceId;
}

// Direct import from JSON data (for API usage)
export async function importFromJson(data: {
  externalId?: string;
  name: string;
  audioUrl: string;
  sourceUrl?: string;
  whisperJson: unknown;
}): Promise<string> {
  const { parseWhisperJson } = await import("@/types/whisper");
  const whisperJson = parseWhisperJson(data.whisperJson);

  if (!whisperJson) {
    throw new Error("Invalid Whisper JSON format");
  }

  return importAudioSource({
    externalId: data.externalId || uuid(),
    name: data.name,
    audioUrl: data.audioUrl,
    sourceUrl: data.sourceUrl,
    whisperJson,
  });
}
