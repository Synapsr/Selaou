"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, PenLine, Search } from "lucide-react";
import { Avatar } from "./Avatar";
import { RelativeTime } from "./RelativeTime";
import { DiffRenderer } from "./DiffRenderer";
import { cn } from "@/lib/utils";

interface CorrectedWord {
  index: number;
  original: string;
  corrected: string;
}

export interface ReviewRow {
  id: string;
  segmentId: string;
  reviewerId: string;
  isCorrect: boolean;
  correctedText: string | null;
  correctedWords: CorrectedWord[] | null;
  createdAt: string;
  reviewerEmail: string;
  reviewerDisplayName: string | null;
  segmentText: string;
  audioSourceName: string;
}

type Filter = "all" | "corrections" | "validations";

interface ReviewsListProps {
  reviews: ReviewRow[];
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  const prefersReducedMotion = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    return {
      all: reviews.length,
      corrections: reviews.filter((r) => !r.isCorrect).length,
      validations: reviews.filter((r) => r.isCorrect).length,
    };
  }, [reviews]);

  const visible = useMemo(() => {
    let list = reviews;
    if (filter === "corrections") list = list.filter((r) => !r.isCorrect);
    if (filter === "validations") list = list.filter((r) => r.isCorrect);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.segmentText.toLowerCase().includes(q) ||
          r.reviewerEmail.toLowerCase().includes(q) ||
          (r.reviewerDisplayName ?? "").toLowerCase().includes(q) ||
          r.audioSourceName.toLowerCase().includes(q) ||
          (r.correctedText ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [reviews, filter, query]);

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-slate-200 bg-white">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Toutes"
            count={counts.all}
          />
          <FilterPill
            active={filter === "corrections"}
            onClick={() => setFilter("corrections")}
            label="Corrections"
            count={counts.corrections}
            accent="blue"
          />
          <FilterPill
            active={filter === "validations"}
            onClick={() => setFilter("validations")}
            label="Validations"
            count={counts.validations}
            accent="emerald"
          />
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans les annotations…"
            className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-400">
            {reviews.length === 0
              ? "Aucune annotation pour l'instant."
              : "Aucun résultat pour ce filtre."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((review, idx) => (
            <motion.li
              key={review.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : idx * 0.02 }}
              className={cn(
                "rounded-xl border bg-white overflow-hidden transition-colors hover:border-slate-300",
                review.isCorrect ? "border-slate-200" : "border-slate-200"
              )}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/40">
                <Avatar
                  seed={review.reviewerEmail}
                  label={review.reviewerDisplayName ?? review.reviewerEmail}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {review.reviewerDisplayName ?? "Annotateur"}
                    <span className="ml-1.5 text-slate-400 font-normal text-xs font-mono">
                      {review.reviewerEmail}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    sur <span className="text-slate-500">{review.audioSourceName}</span> ·{" "}
                    <RelativeTime date={review.createdAt} />
                  </p>
                </div>
                <StatusBadge isCorrect={review.isCorrect} />
              </div>

              {/* Diff body */}
              <div className="px-4 py-4">
                <DiffRenderer
                  original={review.segmentText}
                  correctedWords={review.correctedWords}
                  correctedText={review.correctedText}
                />
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent?: "blue" | "emerald";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors",
        active
          ? accent === "blue"
            ? "bg-blue-100 text-blue-700"
            : accent === "emerald"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-900 text-white"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
      )}
    >
      {label}
      <span
        className={cn(
          "tabular-nums text-[11px] rounded-full px-1.5 py-0.5",
          active
            ? accent
              ? "bg-white/60"
              : "bg-white/15 text-white"
            : "bg-slate-100 text-slate-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function StatusBadge({ isCorrect }: { isCorrect: boolean }) {
  return isCorrect ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
      <Check className="h-3 w-3" />
      Validé
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
      <PenLine className="h-3 w-3" />
      Corrigé
    </span>
  );
}
