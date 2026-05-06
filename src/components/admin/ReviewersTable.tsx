"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Search, EyeOff } from "lucide-react";
import { Avatar } from "./Avatar";
import { RelativeTime } from "./RelativeTime";
import { cn, formatCount } from "@/lib/utils";

export interface ReviewerRow {
  id: string;
  email: string;
  displayName: string | null;
  isPublic: boolean;
  reviewCount: number;
  correctionCount: number;
  createdAt: string;
  lastReviewAt: string | null;
}

type Field = "reviewCount" | "correctionCount" | "createdAt" | "lastReviewAt";
type Order = "asc" | "desc";

interface ReviewersTableProps {
  reviewers: ReviewerRow[];
  sort: { field: Field; order: Order };
  onSort: (field: Field) => void;
}

function SortableHead({
  label,
  field,
  current,
  onClick,
  align = "left",
}: {
  label: string;
  field: Field;
  current: { field: Field; order: Order };
  onClick: () => void;
  align?: "left" | "right";
}) {
  const isActive = current.field === field;
  return (
    <th className={cn("py-2.5 px-3 text-xs uppercase tracking-wide text-slate-500 font-medium", align === "right" && "text-right")}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-slate-900 transition-colors",
          isActive && "text-slate-900"
        )}
      >
        {label}
        {isActive &&
          (current.order === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
}

export function ReviewersTable({ reviewers, sort, onSort }: ReviewersTableProps) {
  const prefersReducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return reviewers;
    const q = query.toLowerCase();
    return reviewers.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.displayName ?? "").toLowerCase().includes(q)
    );
  }, [reviewers, query]);

  const maxReviews = Math.max(1, ...reviewers.map((r) => r.reviewCount));

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un annotateur…"
          className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-left text-xs uppercase tracking-wide text-slate-500 font-medium">
                Annotateur
              </th>
              <SortableHead
                label="Annotations"
                field="reviewCount"
                current={sort}
                onClick={() => onSort("reviewCount")}
                align="right"
              />
              <SortableHead
                label="Corrections"
                field="correctionCount"
                current={sort}
                onClick={() => onSort("correctionCount")}
                align="right"
              />
              <th className="py-2.5 px-3 text-right text-xs uppercase tracking-wide text-slate-500 font-medium hidden md:table-cell">
                Taux
              </th>
              <SortableHead
                label="Inscription"
                field="createdAt"
                current={sort}
                onClick={() => onSort("createdAt")}
              />
              <SortableHead
                label="Dernière activité"
                field="lastReviewAt"
                current={sort}
                onClick={() => onSort("lastReviewAt")}
              />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                  {reviewers.length === 0
                    ? "Aucun annotateur pour l'instant."
                    : "Aucun résultat pour cette recherche."}
                </td>
              </tr>
            ) : (
              filtered.map((reviewer, idx) => {
                const rate =
                  reviewer.reviewCount > 0
                    ? Math.round(
                        (reviewer.correctionCount / reviewer.reviewCount) * 100
                      )
                    : 0;
                const reviewsBar = (reviewer.reviewCount / maxReviews) * 100;

                return (
                  <motion.tr
                    key={reviewer.id}
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: prefersReducedMotion ? 0 : idx * 0.015 }}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          seed={reviewer.email}
                          label={reviewer.displayName ?? reviewer.email}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate flex items-center gap-1.5">
                            {reviewer.displayName ?? "Annotateur"}
                            {!reviewer.isPublic && (
                              <span title="Profil privé (n'apparaît pas dans le classement)">
                                <EyeOff className="h-3 w-3 text-slate-400" />
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 truncate font-mono">
                            {reviewer.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatCount(reviewer.reviewCount)}
                        </span>
                        <span className="block w-20 h-1 rounded-full bg-slate-100 overflow-hidden">
                          <motion.span
                            initial={prefersReducedMotion ? false : { scaleX: 0 }}
                            animate={{ scaleX: reviewsBar / 100 }}
                            transition={{ duration: 0.6, delay: idx * 0.02 }}
                            style={{ originX: 0 }}
                            className="block h-full bg-blue-500 rounded-full"
                          />
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                      {formatCount(reviewer.correctionCount)}
                    </td>
                    <td className="py-3 px-3 text-right hidden md:table-cell">
                      <span
                        className={cn(
                          "inline-block tabular-nums text-xs font-semibold rounded-md px-2 py-0.5",
                          rate >= 50
                            ? "bg-amber-50 text-amber-700"
                            : rate >= 20
                              ? "bg-blue-50 text-blue-700"
                              : "bg-emerald-50 text-emerald-700"
                        )}
                      >
                        {reviewer.reviewCount > 0 ? `${rate}%` : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-xs">
                      <RelativeTime date={reviewer.createdAt} />
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-xs">
                      <RelativeTime date={reviewer.lastReviewAt} />
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
