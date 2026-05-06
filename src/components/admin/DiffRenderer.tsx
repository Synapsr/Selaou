"use client";

import { Plus, Minus, Trash2 } from "lucide-react";

interface CorrectedWord {
  index: number;
  original: string;
  corrected: string;
}

interface DiffRendererProps {
  /** Original text from Whisper, before any annotation. */
  original: string;
  /**
   * Word-level edits as stored by /api/reviews. May be null/undefined when the
   * review is a plain validation (no changes).
   */
  correctedWords?: CorrectedWord[] | null;
  /** Full corrected text (fallback when correctedWords is missing). */
  correctedText?: string | null;
  /** Compact mode: smaller text, used inside dense lists. */
  compact?: boolean;
}

/**
 * GitHub-style inline diff for a single segment review. Renders the original
 * text and reveals each modified token side-by-side: deleted word in red with
 * a strikethrough, replacement word highlighted in green.
 *
 * Three cases are handled:
 *   1. Pure validation (no changes)             → just the original text
 *   2. Word edits via correctedWords[]          → inline red/green chunks
 *   3. Free-form correctedText without metadata → original + arrow + corrected
 */
export function DiffRenderer({
  original,
  correctedWords,
  correctedText,
  compact = false,
}: DiffRendererProps) {
  const baseClass = compact ? "text-sm leading-relaxed" : "text-base leading-loose";

  // Case 1 — no edits at all
  if (
    (!correctedWords || correctedWords.length === 0) &&
    (!correctedText || correctedText === original)
  ) {
    return (
      <p className={`${baseClass} text-slate-700`}>
        {original}
        <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-600 font-medium">
          validé sans modification
        </span>
      </p>
    );
  }

  // Case 2 — granular word-level edits
  if (correctedWords && correctedWords.length > 0) {
    const editsByIndex = new Map<number, CorrectedWord>();
    for (const edit of correctedWords) editsByIndex.set(edit.index, edit);

    const tokens = original.split(/\s+/).filter(Boolean);

    return (
      <p className={`${baseClass} text-slate-700`}>
        {tokens.map((token, idx) => {
          const edit = editsByIndex.get(idx);
          const space = idx < tokens.length - 1 ? " " : "";

          if (!edit) {
            return (
              <span key={idx} className="text-slate-700">
                {token}
                {space}
              </span>
            );
          }

          // Deletion: corrected is empty
          if (edit.corrected === "") {
            return (
              <span key={idx} className="inline-flex items-center">
                <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-red-700 line-through decoration-red-400/60">
                  <Trash2 className="h-3 w-3" />
                  {edit.original}
                </span>
                {space}
              </span>
            );
          }

          // Replacement: original → corrected
          return (
            <span key={idx} className="inline-flex items-center gap-0.5">
              <span className="inline-flex items-center rounded-l-md bg-red-50 px-1.5 py-0.5 text-red-700 line-through decoration-red-400/60">
                <Minus className="h-3 w-3 mr-0.5 text-red-500/70 no-underline" strokeWidth={3} />
                {edit.original}
              </span>
              <span className="inline-flex items-center rounded-r-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-medium border-l border-white">
                <Plus className="h-3 w-3 mr-0.5 text-emerald-500/80" strokeWidth={3} />
                {edit.corrected}
              </span>
              {space}
            </span>
          );
        })}
      </p>
    );
  }

  // Case 3 — coarse correctedText only (no per-word metadata)
  return (
    <div className={`${baseClass} space-y-1.5`}>
      <p className="flex items-start gap-2 text-slate-700">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-red-50">
          <Minus className="h-3 w-3 text-red-600" strokeWidth={3} />
        </span>
        <span className="bg-red-50 px-1.5 py-0.5 rounded text-red-700 line-through decoration-red-400/60">
          {original}
        </span>
      </p>
      <p className="flex items-start gap-2 text-slate-800">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-50">
          <Plus className="h-3 w-3 text-emerald-600" strokeWidth={3} />
        </span>
        <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-medium">
          {correctedText}
        </span>
      </p>
    </div>
  );
}
