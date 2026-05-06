import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getConfidenceClass(confidence: number): string {
  // Adjusted thresholds for real-world ASR scores
  if (confidence >= 0.6) return "word-confidence-high";
  if (confidence >= 0.4) return "word-confidence-medium";
  return "word-confidence-low";
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "Haute confiance";
  if (confidence >= 0.7) return "Confiance moyenne";
  return "Faible confiance";
}

/**
 * Format an audio duration in human-friendly French.
 *   12   -> "12 s"
 *   95   -> "1 min 35 s"
 *   3725 -> "1 h 02 min"
 *   45000 -> "12 h 30"
 */
export function formatAudioDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 s";
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const mins = Math.floor(total / 60);
  if (mins < 60) {
    const remSec = total % 60;
    return remSec === 0 ? `${mins} min` : `${mins} min ${remSec.toString().padStart(2, "0")} s`;
  }
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin === 0 ? `${hours} h` : `${hours} h ${remMin.toString().padStart(2, "0")}`;
}

/**
 * Compact French number formatting: 1234 -> "1 234", 12000 -> "12 k".
 */
export function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10000) return n.toLocaleString("fr-FR");
  return `${(n / 1000).toFixed(n < 100000 ? 1 : 0).replace(".0", "")} k`;
}
