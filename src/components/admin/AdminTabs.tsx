"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminTabDef<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
  /** Small badge count rendered next to the label. */
  badge?: number;
  /** When true, the badge gets a destructive accent. */
  badgeUrgent?: boolean;
}

interface AdminTabsProps<T extends string> {
  tabs: AdminTabDef<T>[];
  active: T;
  onSelect: (value: T) => void;
}

export function AdminTabs<T extends string>({
  tabs,
  active,
  onSelect,
}: AdminTabsProps<T>) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl border border-slate-200 bg-white w-fit">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            onClick={() => onSelect(tab.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="admin-tab-pill"
                className="absolute inset-0 bg-slate-900 rounded-lg"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 30 }
                }
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    "ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                    isActive
                      ? tab.badgeUrgent
                        ? "bg-red-500 text-white"
                        : "bg-white/20 text-white"
                      : tab.badgeUrgent
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
