"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: (n: number) => string;
  hint?: string;
  accent?: "blue" | "green" | "amber" | "slate";
}

const ACCENT_CLASSES: Record<NonNullable<StatTileProps["accent"]>, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatTile({
  icon: Icon,
  label,
  value,
  format,
  hint,
  accent = "blue",
}: StatTileProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${ACCENT_CLASSES[accent]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
        <AnimatedCounter value={value} format={format} />
      </p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </motion.div>
  );
}
