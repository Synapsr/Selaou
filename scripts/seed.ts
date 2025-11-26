#!/usr/bin/env npx tsx

/**
 * Seed script to add sample data for testing
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 */

import { importFromJson } from "../src/lib/data-sources/importer";

const sampleWhisperOutput = {
  text: "Bonjour et bienvenue dans cette émission de radio. Aujourd'hui nous allons parler de la météo en Bretagne.",
  language: "fr",
  segments: [
    {
      id: 0,
      seek: 0,
      start: 0.0,
      end: 3.5,
      text: " Bonjour et bienvenue dans cette émission de radio.",
      tokens: [50364, 10358, 293, 6697, 18376],
      temperature: 0.0,
      avg_logprob: -0.25,
      compression_ratio: 1.2,
      no_speech_prob: 0.01,
      words: [
        { word: " Bonjour", start: 0.0, end: 0.5, probability: 0.98 },
        { word: " et", start: 0.5, end: 0.7, probability: 0.99 },
        { word: " bienvenue", start: 0.7, end: 1.2, probability: 0.95 },
        { word: " dans", start: 1.2, end: 1.4, probability: 0.97 },
        { word: " cette", start: 1.4, end: 1.6, probability: 0.96 },
        { word: " émission", start: 1.6, end: 2.1, probability: 0.89 },
        { word: " de", start: 2.1, end: 2.3, probability: 0.98 },
        { word: " radio.", start: 2.3, end: 3.5, probability: 0.94 },
      ],
    },
    {
      id: 1,
      seek: 350,
      start: 3.5,
      end: 7.2,
      text: " Aujourd'hui nous allons parler de la météo en Bretagne.",
      tokens: [50364, 5765, 13],
      temperature: 0.0,
      avg_logprob: -0.3,
      compression_ratio: 1.1,
      no_speech_prob: 0.02,
      words: [
        { word: " Aujourd'hui", start: 3.5, end: 4.2, probability: 0.92 },
        { word: " nous", start: 4.2, end: 4.4, probability: 0.97 },
        { word: " allons", start: 4.4, end: 4.7, probability: 0.95 },
        { word: " parler", start: 4.7, end: 5.1, probability: 0.93 },
        { word: " de", start: 5.1, end: 5.2, probability: 0.99 },
        { word: " la", start: 5.2, end: 5.3, probability: 0.98 },
        { word: " météo", start: 5.3, end: 5.8, probability: 0.72 }, // Lower confidence
        { word: " en", start: 5.8, end: 5.9, probability: 0.97 },
        { word: " Bretagne.", start: 5.9, end: 7.2, probability: 0.65 }, // Lower confidence
      ],
    },
    {
      id: 2,
      seek: 720,
      start: 7.2,
      end: 12.0,
      text: " Les prévisions annoncent de la pluie pour les prochains jours.",
      tokens: [50364, 50257],
      temperature: 0.0,
      avg_logprob: -0.35,
      compression_ratio: 1.15,
      no_speech_prob: 0.03,
      words: [
        { word: " Les", start: 7.2, end: 7.4, probability: 0.96 },
        { word: " prévisions", start: 7.4, end: 8.1, probability: 0.78 },
        { word: " annoncent", start: 8.1, end: 8.7, probability: 0.55 }, // Low confidence
        { word: " de", start: 8.7, end: 8.8, probability: 0.97 },
        { word: " la", start: 8.8, end: 8.9, probability: 0.98 },
        { word: " pluie", start: 8.9, end: 9.4, probability: 0.88 },
        { word: " pour", start: 9.4, end: 9.6, probability: 0.95 },
        { word: " les", start: 9.6, end: 9.8, probability: 0.97 },
        { word: " prochains", start: 9.8, end: 10.5, probability: 0.82 },
        { word: " jours.", start: 10.5, end: 12.0, probability: 0.91 },
      ],
    },
  ],
};

async function main() {
  console.log("🌱 Seeding database with sample data...\n");

  try {
    const sourceId = await importFromJson({
      externalId: "sample-001",
      name: "Radio Bretagne - Episode Test",
      audioUrl: "https://example.com/audio/sample-episode.mp3",
      whisperJson: sampleWhisperOutput,
    });

    console.log(`✅ Created sample audio source: ${sourceId}`);
    console.log(`   - ${sampleWhisperOutput.segments.length} segments imported`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log("⏭️  Sample data already exists, skipping.");
    } else {
      throw error;
    }
  }

  console.log("\n✨ Seed complete!");
  console.log("\n📝 You can now:");
  console.log("   1. Run `npm run dev` to start the app");
  console.log("   2. Go to http://localhost:3000");
  console.log("   3. Enter your email and start reviewing!");
}

main().catch(console.error);
