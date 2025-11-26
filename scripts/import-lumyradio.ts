#!/usr/bin/env npx tsx

/**
 * Import script for LumyRadio episodes from radios.bzh API
 *
 * Usage:
 *   npx tsx scripts/import-lumyradio.ts
 *
 * Or with npm:
 *   npm run import:lumyradio
 */

const API_BASE_URL = "https://direct.api.radios.bzh/items/episode_ai";
const API_FIELDS = "fields=*,episode.*";
const PAGE_LIMIT = 250;
const ASSETS_BASE_URL = "https://direct.api.radios.bzh/assets";
const EPISODE_BASE_URL = "https://synapse.radios.bzh"; // URL to view episodes on synapse
const SELAOU_API_URL = process.env.SELAOU_API_URL || "http://localhost:3000";
const REQUIRED_LANGUAGE = "br"; // Only import Breton episodes

interface LumyRadioWord {
  word: string;
  start: number;
  end: number;
  score: number;
  speaker?: string;
}

interface LumyRadioSegment {
  start: number;
  end: number;
  text: string;
  words: LumyRadioWord[];
  speaker?: string;
}

interface LumyRadioEpisode {
  id: string;
  date_created: string;
  date_updated: string;
  status: string;
  program?: string;
  image?: string;
  date?: string;
  duration?: number;
  tags?: string[];
  podcast?: string; // UUID for audio file
  podcast_raw?: string;
}

interface LumyRadioTranscription {
  duration: number;
  language: string;
  segments: LumyRadioSegment[];
}

interface LumyRadioLanguageDetection {
  language: string;
  confidence: number;
  language_name: string;
}

interface LumyRadioEpisodeAI {
  id: number;
  status: string;
  episode: LumyRadioEpisode;
  transcription: LumyRadioTranscription;
  language_detection?: LumyRadioLanguageDetection;
  speech_segments?: {
    segments: Array<{ start: number; end: number; duration: number }>;
    speech_ratio: number;
    total_audio_duration: number;
    total_speech_duration: number;
  };
  diarization_speaker_name?: Array<{ name: string; speaker: string }>;
}

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: WhisperWord[];
  avg_logprob: number;
  no_speech_prob: number;
  temperature: number;
  compression_ratio: number;
  seek: number;
  tokens: number[];
}

interface WhisperOutput {
  text: string;
  language: string;
  segments: WhisperSegment[];
}

// Convert LumyRadio format to Whisper format
function convertToWhisperFormat(episodeAI: LumyRadioEpisodeAI): WhisperOutput {
  const transcription = episodeAI.transcription;

  const segments: WhisperSegment[] = transcription.segments.map((seg: LumyRadioSegment, index: number) => {
    // Convert words - map 'score' to 'probability'
    const words: WhisperWord[] = seg.words?.map((w: LumyRadioWord) => ({
      word: w.word.startsWith(" ") ? w.word : ` ${w.word}`,
      start: w.start,
      end: w.end,
      probability: w.score,
    })) || [];

    // Calculate average probability for the segment
    const avgProb = words.length > 0
      ? words.reduce((sum, w) => sum + w.probability, 0) / words.length
      : 0.8;

    return {
      id: index,
      start: seg.start,
      end: seg.end,
      text: seg.text.startsWith(" ") ? seg.text : ` ${seg.text}`,
      words,
      avg_logprob: Math.log(avgProb), // Convert probability to logprob
      no_speech_prob: 0.01,
      temperature: 0,
      compression_ratio: 1.2,
      seek: Math.floor(seg.start * 100),
      tokens: [],
    };
  });

  // Build full text from segments
  const fullText = segments.map((s) => s.text).join("").trim();

  return {
    text: fullText,
    language: transcription.language || "fr",
    segments,
  };
}

// Get episode name from episode data
function getEpisodeName(episode: LumyRadioEpisode): string {
  const date = episode.date
    ? new Date(episode.date).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date inconnue";

  const program = episode.program || "LumyRadio";

  return `${program} - ${date}`;
}

// Import a single episode to Selaou
async function importEpisode(episodeAI: LumyRadioEpisodeAI): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const episode = episodeAI.episode;

  // Check language - only import Breton content
  const detectedLanguage = episodeAI.language_detection?.language;
  if (detectedLanguage !== REQUIRED_LANGUAGE) {
    return { success: false, error: `Language is ${detectedLanguage || "unknown"}, not ${REQUIRED_LANGUAGE}`, skipped: true };
  }

  if (!episode?.podcast) {
    return { success: false, error: "No podcast/audio ID found" };
  }

  if (!episodeAI.transcription?.segments) {
    return { success: false, error: "No transcription data" };
  }

  const audioUrl = `${ASSETS_BASE_URL}/${episode.podcast}`;
  const sourceUrl = `${EPISODE_BASE_URL}/${episode.id}`;
  const name = getEpisodeName(episode);
  const whisperJson = convertToWhisperFormat(episodeAI);

  console.log(`  Importing: ${name}`);
  console.log(`    Audio: ${audioUrl}`);
  console.log(`    Source: ${sourceUrl}`);
  console.log(`    Segments: ${whisperJson.segments.length}`);

  try {
    const response = await fetch(`${SELAOU_API_URL}/api/sources/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalId: `lumyradio-${episode.id}`,
        name,
        audioUrl,
        sourceUrl,
        whisperJson,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.code === "DUPLICATE") {
        return { success: false, error: "Already imported" };
      }
      return { success: false, error: error.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    console.log(`    ✅ Imported with ID: ${result.sourceId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchPage(page: number): Promise<{ data: LumyRadioEpisodeAI[]; hasMore: boolean }> {
  const url = `${API_BASE_URL}?${API_FIELDS}&limit=${PAGE_LIMIT}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch API: ${response.status}`);
  }

  const { data } = await response.json() as { data: LumyRadioEpisodeAI[] };
  return {
    data,
    hasMore: data.length === PAGE_LIMIT,
  };
}

async function main() {
  console.log("🎙️  LumyRadio Import Script\n");
  console.log(`API: ${API_BASE_URL}`);
  console.log(`Selaou: ${SELAOU_API_URL}`);
  console.log(`Language filter: ${REQUIRED_LANGUAGE}\n`);

  // Import counters
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let totalFetched = 0;

  // Fetch and process pages
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`📡 Fetching page ${page} (limit ${PAGE_LIMIT})...`);

    try {
      const result = await fetchPage(page);
      const episodes = result.data;
      hasMore = result.hasMore;
      totalFetched += episodes.length;

      console.log(`   Found ${episodes.length} episodes on page ${page}\n`);

      // Process each episode
      for (const episodeAI of episodes) {
        const importResult = await importEpisode(episodeAI);

        if (importResult.success) {
          imported++;
        } else if (importResult.error === "Already imported") {
          console.log(`    ⏭️  Skipped (already imported)`);
          skipped++;
        } else if (importResult.skipped) {
          // Language mismatch - silently skip
          skipped++;
        } else {
          console.log(`    ❌ Error: ${importResult.error}`);
          errors++;
        }

        if (importResult.success || importResult.error === "Already imported" || !importResult.skipped) {
          console.log("");
        }
      }

      page++;
    } catch (error) {
      console.error(`❌ Failed to fetch page ${page}:`, error);
      break;
    }
  }

  // Summary
  console.log("━".repeat(50));
  console.log("📊 Import Summary:");
  console.log(`   📥 Total fetched: ${totalFetched}`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped} (wrong language or already imported)`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log("");

  if (imported > 0) {
    console.log(`🎉 ${imported} Breton episodes ready for annotation at ${SELAOU_API_URL}`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
