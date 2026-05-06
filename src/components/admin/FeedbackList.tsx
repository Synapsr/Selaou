"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, MessageSquare, Trash2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { RelativeTime } from "./RelativeTime";
import { cn } from "@/lib/utils";

export interface FeedbackRow {
  id: string;
  segmentId: string;
  reviewerId: string;
  type: string;
  message: string | null;
  createdAt: string;
  reviewerEmail: string;
  segmentText: string;
  audioSourceName: string;
  audioSourceId: string;
}

interface FeedbackListProps {
  feedback: FeedbackRow[];
  counts: { audio_issue: number; remark: number };
  filter: string;
  onFilterChange: (filter: string) => void;
  onDeleteSegment: (segmentId: string) => void;
}

export function FeedbackList({
  feedback,
  counts,
  filter,
  onFilterChange,
  onDeleteSegment,
}: FeedbackListProps) {
  const prefersReducedMotion = useReducedMotion();

  const total = (counts.audio_issue || 0) + (counts.remark || 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={filter === ""}
          onClick={() => onFilterChange("")}
          label="Tout"
          count={total}
        />
        <FilterChip
          active={filter === "audio_issue"}
          onClick={() => onFilterChange("audio_issue")}
          label="Problèmes audio"
          count={counts.audio_issue || 0}
          icon={AlertTriangle}
          accent="red"
        />
        <FilterChip
          active={filter === "remark"}
          onClick={() => onFilterChange("remark")}
          label="Remarques"
          count={counts.remark || 0}
          icon={MessageSquare}
          accent="amber"
        />
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-400">Aucune alerte pour l&apos;instant.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {feedback.map((fb, idx) => {
            const isUrgent = fb.type === "audio_issue";
            return (
              <motion.li
                key={fb.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : idx * 0.02 }}
                className={cn(
                  "rounded-xl border bg-white overflow-hidden",
                  isUrgent ? "border-red-200" : "border-amber-200/70"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b",
                    isUrgent
                      ? "bg-red-50/50 border-red-100"
                      : "bg-amber-50/40 border-amber-100"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full",
                      isUrgent ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {isUrgent ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isUrgent ? "text-red-700" : "text-amber-800"
                      )}
                    >
                      {isUrgent ? "Problème audio signalé" : "Remarque"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      sur <span className="text-slate-700">{fb.audioSourceName}</span> ·{" "}
                      <RelativeTime date={fb.createdAt} />
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteSegment(fb.segmentId)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 px-2.5 py-1 text-xs font-medium transition-colors"
                    title="Supprimer le segment"
                  >
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                  </button>
                </div>

                <div className="px-4 py-3 space-y-2">
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    « {fb.segmentText} »
                  </p>
                  {fb.message && (
                    <p
                      className={cn(
                        "text-sm rounded-md px-3 py-2",
                        isUrgent
                          ? "bg-red-50 text-red-800 border-l-2 border-red-300"
                          : "bg-amber-50/70 text-amber-900 border-l-2 border-amber-300"
                      )}
                    >
                      {fb.message}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Avatar seed={fb.reviewerEmail} size="sm" />
                    <span className="text-xs text-slate-500">
                      Signalé par{" "}
                      <span className="font-mono text-slate-600">{fb.reviewerEmail}</span>
                    </span>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon: Icon,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: typeof AlertTriangle;
  accent?: "red" | "amber";
}) {
  const tone = active
    ? accent === "red"
      ? "bg-red-600 text-white border-red-600"
      : accent === "amber"
        ? "bg-amber-500 text-white border-amber-500"
        : "bg-slate-900 text-white border-slate-900"
    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900";

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border transition-colors",
        tone
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span className={cn("tabular-nums text-[11px]", active ? "opacity-90" : "text-slate-400")}>
        {count}
      </span>
    </button>
  );
}
