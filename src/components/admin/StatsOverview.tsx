"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Headphones,
  PenLine,
  Users2,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { formatAudioDuration, formatCount } from "@/lib/utils";

export interface AdminOverview {
  reviewers: { total: number; active7d: number };
  reviews: { total: number; corrections: number; last24h: number };
  segments: {
    total: number;
    reviewed: number;
    audioSeconds: number;
    annotatedSeconds: number;
  };
  feedback: { audioIssues: number; remarks: number };
}

interface StatsOverviewProps {
  data: AdminOverview | null;
}

export function StatsOverview({ data }: StatsOverviewProps) {
  const reviews = data?.reviews.total ?? 0;
  const corrections = data?.reviews.corrections ?? 0;
  const correctionRate =
    reviews > 0 ? Math.round((corrections / reviews) * 100) : 0;

  const segments = data?.segments.total ?? 0;
  const reviewed = data?.segments.reviewed ?? 0;
  const coverage = segments > 0 ? Math.round((reviewed / segments) * 100) : 0;

  const reviewers = data?.reviewers.total ?? 0;
  const active7d = data?.reviewers.active7d ?? 0;

  const audioIssues = data?.feedback.audioIssues ?? 0;
  const remarks = data?.feedback.remarks ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile
        icon={PenLine}
        accent="blue"
        label="Annotations"
        value={reviews}
        format={formatCount}
        hint={
          <>
            <span className="text-emerald-600 font-medium">
              +{data?.reviews.last24h ?? 0}
            </span>{" "}
            sur 24 h
          </>
        }
      />
      <Tile
        icon={PenLine}
        accent="amber"
        label="Corrections"
        value={corrections}
        format={formatCount}
        hint={`${correctionRate}% des annotations`}
      />
      <Tile
        icon={Users2}
        accent="violet"
        label="Annotateurs"
        value={reviewers}
        format={formatCount}
        hint={`${active7d} actifs cette semaine`}
      />
      <Tile
        icon={Headphones}
        accent="emerald"
        label="Audio fiabilisé"
        value={data?.segments.annotatedSeconds ?? 0}
        format={formatAudioDuration}
        hint={`${coverage}% des segments couverts`}
      />
      {audioIssues + remarks > 0 && (
        <div className="col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>
            <strong>{audioIssues}</strong> problème{audioIssues > 1 ? "s" : ""} audio
            signalé{audioIssues > 1 ? "s" : ""} ·{" "}
            <strong>{remarks}</strong> remarque{remarks > 1 ? "s" : ""} en attente
          </span>
        </div>
      )}
    </div>
  );
}

const ACCENT: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

function Tile({
  icon: Icon,
  accent,
  label,
  value,
  format,
  hint,
}: {
  icon: typeof Headphones;
  accent: keyof typeof ACCENT | string;
  label: string;
  value: number;
  format: (n: number) => string;
  hint?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${ACCENT[accent] ?? ACCENT.blue}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">
        <AnimatedCounter value={value} format={format} />
      </p>
      {hint !== undefined && (
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      )}
    </motion.div>
  );
}
