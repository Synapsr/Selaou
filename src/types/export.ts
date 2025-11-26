// Export formats supported
export type ExportFormat = "jsonl" | "csv" | "huggingface";

// Export options
export interface ExportOptions {
  format: ExportFormat;
  includeOriginalText: boolean;
  onlyCorrections: boolean;
  minReviewCount: number;
}

// JSONL export format (HuggingFace compatible)
export interface JsonlExportRow {
  audio: {
    path: string;
    start: number;
    end: number;
  };
  text: string;
  original_text: string;
  is_correction: boolean;
  confidence: number;
  review_count: number;
}

// CSV export format
export interface CsvExportRow {
  audio_id: string;
  audio_url: string;
  start_time: number;
  end_time: number;
  original_text: string;
  corrected_text: string;
  is_correction: boolean;
  confidence: number;
  review_count: number;
}

// Stats for export page
export interface ExportStats {
  totalSegments: number;
  reviewedSegments: number;
  correctedSegments: number;
  totalReviews: number;
  totalCorrections: number;
  uniqueReviewers: number;
  audioSources: number;
}
