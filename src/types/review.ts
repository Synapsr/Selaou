import type { Segment, AudioSource, CorrectedWord } from "@/lib/db/schema";

// Segment with audio source info for the review interface
export interface SegmentWithSource extends Segment {
  audioSource: Pick<AudioSource, "id" | "name" | "audioUrl" | "sourceUrl">;
}

// Word representation for the UI
export interface WordState {
  index: number;
  original: string;
  current: string;
  isModified: boolean;
  confidence: number;
  startTime?: number;
  endTime?: number;
}

// Review submission payload
export interface ReviewSubmission {
  segmentId: string;
  reviewerEmail: string;
  isCorrect: boolean;
  correctedText?: string;
  correctedWords?: CorrectedWord[];
}

// API response for next segment
export interface NextSegmentResponse {
  segment: SegmentWithSource | null;
  stats: {
    totalReviews: number;
    totalCorrections: number;
    remainingSegments: number;
  };
}

// Reviewer session (stored in localStorage)
export interface ReviewerSession {
  email: string;
  reviewerId?: string;
  totalReviews: number;
  totalCorrections: number;
}
