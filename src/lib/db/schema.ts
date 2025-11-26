import {
  mysqlTable,
  varchar,
  text,
  json,
  int,
  decimal,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// Audio sources (episodes/files)
export const audioSources = mysqlTable(
  "audio_sources",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    externalId: varchar("external_id", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    audioUrl: text("audio_url").notNull(),
    sourceUrl: text("source_url"), // Optional URL to the original source (podcast page, etc.)
    whisperData: json("whisper_data").notNull(),
    totalSegments: int("total_segments").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    externalIdIdx: index("external_id_idx").on(table.externalId),
  })
);

// Pre-indexed segments for weighted random selection
export const segments = mysqlTable(
  "segments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    audioSourceId: varchar("audio_source_id", { length: 36 }).notNull(),
    segmentIndex: int("segment_index").notNull(),
    startTime: decimal("start_time", { precision: 10, scale: 3 }).notNull(),
    endTime: decimal("end_time", { precision: 10, scale: 3 }).notNull(),
    text: text("text").notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    reviewCount: int("review_count").default(0).notNull(),
  },
  (table) => ({
    audioSourceIdx: index("audio_source_idx").on(table.audioSourceId),
    confidenceIdx: index("confidence_idx").on(table.confidence),
    reviewCountIdx: index("review_count_idx").on(table.reviewCount),
  })
);

// Reviewers (annotators) - simple email-based identification
export const reviewers = mysqlTable(
  "reviewers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    reviewCount: int("review_count").default(0).notNull(),
    correctionCount: int("correction_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    lastReviewAt: timestamp("last_review_at"),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
  })
);

// Reviews/Annotations
export const reviews = mysqlTable(
  "reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    segmentId: varchar("segment_id", { length: 36 }).notNull(),
    reviewerId: varchar("reviewer_id", { length: 36 }).notNull(),
    isCorrect: boolean("is_correct").notNull(),
    correctedText: text("corrected_text"),
    correctedWords: json("corrected_words").$type<CorrectedWord[]>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    segmentIdx: index("segment_idx").on(table.segmentId),
    reviewerIdx: index("reviewer_idx").on(table.reviewerId),
  })
);

// Segment feedback/reports
export const segmentFeedback = mysqlTable(
  "segment_feedback",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    segmentId: varchar("segment_id", { length: 36 }).notNull(),
    reviewerId: varchar("reviewer_id", { length: 36 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'audio_issue' | 'remark'
    message: text("message"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    segmentIdx: index("feedback_segment_idx").on(table.segmentId),
    reviewerIdx: index("feedback_reviewer_idx").on(table.reviewerId),
  })
);

// Data source configurations
export const dataSourceConfigs = mysqlTable("data_source_configs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'sql' | 'json_file' | 'api'
  config: json("config").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const audioSourcesRelations = relations(audioSources, ({ many }) => ({
  segments: many(segments),
}));

export const segmentsRelations = relations(segments, ({ one, many }) => ({
  audioSource: one(audioSources, {
    fields: [segments.audioSourceId],
    references: [audioSources.id],
  }),
  reviews: many(reviews),
}));

export const reviewersRelations = relations(reviewers, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  segment: one(segments, {
    fields: [reviews.segmentId],
    references: [segments.id],
  }),
  reviewer: one(reviewers, {
    fields: [reviews.reviewerId],
    references: [reviewers.id],
  }),
}));

export const segmentFeedbackRelations = relations(segmentFeedback, ({ one }) => ({
  segment: one(segments, {
    fields: [segmentFeedback.segmentId],
    references: [segments.id],
  }),
  reviewer: one(reviewers, {
    fields: [segmentFeedback.reviewerId],
    references: [reviewers.id],
  }),
}));

// Types
export interface CorrectedWord {
  index: number;
  original: string;
  corrected: string;
}

export type AudioSource = typeof audioSources.$inferSelect;
export type NewAudioSource = typeof audioSources.$inferInsert;

export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;

export type Reviewer = typeof reviewers.$inferSelect;
export type NewReviewer = typeof reviewers.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type DataSourceConfig = typeof dataSourceConfigs.$inferSelect;
export type NewDataSourceConfig = typeof dataSourceConfigs.$inferInsert;

export type SegmentFeedback = typeof segmentFeedback.$inferSelect;
export type NewSegmentFeedback = typeof segmentFeedback.$inferInsert;
