// Whisper JSON output format (standard)
export interface WhisperOutput {
  text: string;
  segments: WhisperSegment[];
  language?: string;
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words?: WhisperWord[];
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

// Calculated confidence for a segment
export function calculateSegmentConfidence(segment: WhisperSegment): number {
  // If we have word-level data, use average word probability
  if (segment.words && segment.words.length > 0) {
    const avgProb =
      segment.words.reduce((sum, w) => sum + w.probability, 0) /
      segment.words.length;
    return avgProb;
  }

  // Fallback to avg_logprob converted to probability
  // logprob is typically negative, closer to 0 = higher confidence
  // Convert: prob = exp(logprob)
  const prob = Math.exp(segment.avg_logprob);
  return Math.min(1, Math.max(0, prob));
}

// Parse and validate Whisper JSON
export function parseWhisperJson(data: unknown): WhisperOutput | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  if (typeof obj.text !== "string") return null;
  if (!Array.isArray(obj.segments)) return null;

  return {
    text: obj.text,
    segments: obj.segments as WhisperSegment[],
    language: typeof obj.language === "string" ? obj.language : undefined,
  };
}
