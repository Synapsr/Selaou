"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ActivityHeatmapProps {
  data: Array<{ day: string; count: number }>;
  /** Number of weeks to render. Defaults to 13 (~3 months). */
  weeks?: number;
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "janv", "févr", "mars", "avr", "mai", "juin",
  "juil", "août", "sept", "oct", "nov", "déc",
];

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function intensityClass(count: number): string {
  if (count <= 0) return "bg-slate-100";
  if (count < 3) return "bg-blue-200";
  if (count < 8) return "bg-blue-400";
  if (count < 20) return "bg-blue-500";
  return "bg-blue-700";
}

/**
 * GitHub-style contribution heatmap. Renders the last `weeks` weeks aligned
 * on Monday columns. Pure CSS grid — no canvas — so it stays sharp on retina
 * and accessible to keyboard navigation.
 */
export function ActivityHeatmap({ data, weeks = 13 }: ActivityHeatmapProps) {
  const prefersReducedMotion = useReducedMotion();

  const { columns, monthMarkers } = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) map.set(row.day, row.count);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Anchor: most recent Monday (so the rightmost column ends today)
    const totalDays = weeks * 7;
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1));
    // Shift to the previous Monday so each column is a full week
    const dow = (start.getDay() + 6) % 7; // 0 = Mon
    start.setDate(start.getDate() - dow);

    const cols: Array<Array<{ date: Date; key: string; count: number; future: boolean }>> = [];
    const months: Array<{ colIndex: number; label: string }> = [];
    let lastMonth = -1;

    const cursor = new Date(start);
    for (let c = 0; c < weeks + 1; c++) {
      const week: Array<{ date: Date; key: string; count: number; future: boolean }> = [];
      for (let r = 0; r < 7; r++) {
        const date = new Date(cursor);
        const key = isoDay(date);
        week.push({
          date,
          key,
          count: map.get(key) ?? 0,
          future: date > today,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      const colMonth = week[0].date.getMonth();
      if (colMonth !== lastMonth) {
        months.push({ colIndex: c, label: MONTH_LABELS[colMonth] });
        lastMonth = colMonth;
      }
      cols.push(week);
    }

    return { columns: cols, monthMarkers: months };
  }, [data, weeks]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-2 min-w-full">
        <div className="flex gap-1 pl-6">
          {columns.map((_, idx) => {
            const marker = monthMarkers.find((m) => m.colIndex === idx);
            return (
              <div key={idx} className="w-3 text-[10px] text-slate-400">
                {marker?.label ?? ""}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 pr-1 text-[10px] text-slate-400">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="h-3 leading-3">
                {i % 2 === 1 ? d : ""}
              </span>
            ))}
          </div>
          {columns.map((week, c) => (
            <div key={c} className="flex flex-col gap-1">
              {week.map((cell, r) => (
                <motion.div
                  key={cell.key}
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: cell.future ? 0.3 : 1, scale: 1 }}
                  transition={{ delay: prefersReducedMotion ? 0 : (c * 7 + r) * 0.003 }}
                  className={`h-3 w-3 rounded-[3px] ${cell.future ? "bg-slate-50" : intensityClass(cell.count)}`}
                  title={
                    cell.future
                      ? ""
                      : cell.count === 0
                        ? `${cell.date.toLocaleDateString("fr-FR")} — aucune annotation`
                        : `${cell.date.toLocaleDateString("fr-FR")} — ${cell.count} annotation${cell.count > 1 ? "s" : ""}`
                  }
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-6 pt-1">
          <span>moins</span>
          <span className="h-3 w-3 rounded-[3px] bg-slate-100" />
          <span className="h-3 w-3 rounded-[3px] bg-blue-200" />
          <span className="h-3 w-3 rounded-[3px] bg-blue-400" />
          <span className="h-3 w-3 rounded-[3px] bg-blue-500" />
          <span className="h-3 w-3 rounded-[3px] bg-blue-700" />
          <span>plus</span>
        </div>
      </div>
    </div>
  );
}
