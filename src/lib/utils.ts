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
