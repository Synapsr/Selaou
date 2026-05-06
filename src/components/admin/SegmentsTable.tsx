"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, ExternalLink, Play, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentRow {
  id: string;
  audioSourceId: string;
  segmentIndex: number;
  startTime: string;
  endTime: string;
  text: string;
  confidence: string;
  reviewCount: number;
  audioSourceName: string;
  audioUrl: string;
}

type Field = "reviewCount" | "confidence";
type Order = "asc" | "desc";

interface SegmentsTableProps {
  segments: SegmentRow[];
  sort: { field: Field; order: Order };
  onSort: (field: Field) => void;
  onDelete: (segmentId: string) => void;
}

function ConfidenceBar({ value }: { value: number }) {
  const tone =
    value >= 0.6
      ? "bg-emerald-500"
      : value >= 0.4
        ? "bg-amber-500"
        : "bg-red-500";
  const text =
    value >= 0.6
      ? "text-emerald-700"
      : value >= 0.4
        ? "text-amber-700"
        : "text-red-700";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${Math.max(4, value * 100)}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", text)}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export function SegmentsTable({ segments, sort, onSort, onDelete }: SegmentsTableProps) {
  const prefersReducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? segments.filter(
        (s) =>
          s.text.toLowerCase().includes(query.toLowerCase()) ||
          s.audioSourceName.toLowerCase().includes(query.toLowerCase())
      )
    : segments;

  const playSegment = (s: SegmentRow) => {
    const audio = new Audio(s.audioUrl);
    audio.currentTime = parseFloat(s.startTime);
    audio.play().catch(() => {});
    setTimeout(
      () => audio.pause(),
      (parseFloat(s.endTime) - parseFloat(s.startTime)) * 1000
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un segment ou une source…"
          className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-left text-xs uppercase tracking-wide text-slate-500 font-medium">
                Source
              </th>
              <th className="py-2.5 px-3 text-left text-xs uppercase tracking-wide text-slate-500 font-medium">
                Segment
              </th>
              <th className="py-2.5 px-3 text-right text-xs uppercase tracking-wide text-slate-500 font-medium">
                <button
                  onClick={() => onSort("reviewCount")}
                  className={cn(
                    "inline-flex items-center gap-1 hover:text-slate-900 transition-colors",
                    sort.field === "reviewCount" && "text-slate-900"
                  )}
                >
                  Annotations
                  {sort.field === "reviewCount" &&
                    (sort.order === "desc" ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th className="py-2.5 px-3 text-left text-xs uppercase tracking-wide text-slate-500 font-medium">
                <button
                  onClick={() => onSort("confidence")}
                  className={cn(
                    "inline-flex items-center gap-1 hover:text-slate-900 transition-colors",
                    sort.field === "confidence" && "text-slate-900"
                  )}
                >
                  Confiance
                  {sort.field === "confidence" &&
                    (sort.order === "desc" ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th className="py-2.5 px-3 text-right text-xs uppercase tracking-wide text-slate-500 font-medium">
                Durée
              </th>
              <th className="py-2.5 px-3 text-right text-xs uppercase tracking-wide text-slate-500 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                  {segments.length === 0
                    ? "Aucun segment annoté."
                    : "Aucun résultat pour cette recherche."}
                </td>
              </tr>
            ) : (
              filtered.map((segment, idx) => {
                const conf = parseFloat(segment.confidence);
                const dur = parseFloat(segment.endTime) - parseFloat(segment.startTime);
                return (
                  <motion.tr
                    key={segment.id}
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: prefersReducedMotion ? 0 : idx * 0.012 }}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors"
                  >
                    <td
                      className="py-3 px-3 max-w-[140px] truncate text-slate-600 text-xs"
                      title={segment.audioSourceName}
                    >
                      {segment.audioSourceName}
                    </td>
                    <td
                      className="py-3 px-3 max-w-[360px] text-slate-700"
                      title={segment.text}
                    >
                      <p className="truncate">{segment.text}</p>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center min-w-[2rem] tabular-nums rounded-full px-2 py-0.5 text-xs font-semibold",
                          segment.reviewCount >= 3
                            ? "bg-emerald-100 text-emerald-700"
                            : segment.reviewCount >= 1
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {segment.reviewCount}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <ConfidenceBar value={conf} />
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-slate-500 tabular-nums">
                      {dur.toFixed(1)} s
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <IconBtn
                          onClick={() => playSegment(segment)}
                          title="Écouter le segment"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          onClick={() => {
                            const url = `${segment.audioUrl}#t=${Math.floor(parseFloat(segment.startTime))}`;
                            window.open(url, "_blank");
                          }}
                          title="Ouvrir la source"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          onClick={() => onDelete(segment.id)}
                          title="Supprimer le segment"
                          tone="danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
        tone === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}
