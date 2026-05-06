"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Milestone } from "@/lib/milestones";

interface MilestoneBadgeProps {
  milestone: Milestone;
  achieved: boolean;
  progress?: number;
}

export function MilestoneBadge({ milestone, achieved, progress }: MilestoneBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const Icon = milestone.icon;

  return (
    <motion.div
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`relative rounded-xl border p-4 ${
        achieved
          ? "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-50/40"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            achieved ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${
              achieved ? "text-slate-900" : "text-slate-500"
            }`}
          >
            {milestone.title}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {milestone.description}
          </p>
          {!achieved && progress !== undefined && (
            <div className="mt-3">
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={prefersReducedMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: progress }}
                  transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  style={{ originX: 0 }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {Math.round(progress * 100)} %
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
