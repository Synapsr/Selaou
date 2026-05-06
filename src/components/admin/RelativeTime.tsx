"use client";

import { useEffect, useState } from "react";

interface RelativeTimeProps {
  date: string | Date | null | undefined;
  /** Show the absolute date as a tooltip on hover. Default: true. */
  withTooltip?: boolean;
  className?: string;
}

const MINUTE = 60_000;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;

function formatRelative(date: Date, now: number): string {
  const diff = now - date.getTime();
  if (diff < 0) return "à l'instant";
  if (diff < MINUTE) return "à l'instant";
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `il y a ${m} min`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `il y a ${h} h`;
  }
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return `il y a ${d} j`;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function formatAbsolute(date: Date): string {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Friendly relative time (« il y a 3 min ») with an absolute tooltip. Refreshes
 * itself every minute so a list stays accurate without a manual reload.
 */
export function RelativeTime({
  date,
  withTooltip = true,
  className,
}: RelativeTimeProps) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), MINUTE);
    return () => clearInterval(id);
  }, []);

  if (!date) return <span className={className}>—</span>;

  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return <span className={className}>—</span>;
  }

  const label = formatRelative(parsed, Date.now());
  return (
    <span
      className={className}
      title={withTooltip ? formatAbsolute(parsed) : undefined}
    >
      {label}
    </span>
  );
}
