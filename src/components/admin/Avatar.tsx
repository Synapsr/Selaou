"use client";

interface AvatarProps {
  /** String used to derive initials and stable color (typically email or pseudo). */
  seed: string;
  /** Optional explicit label override (e.g. displayName when seed is the email). */
  label?: string;
  size?: "sm" | "md" | "lg";
}

const PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-fuchsia-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-lime-600",
];

const SIZE: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function initials(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9À-ÿ\- ]/g, " ").trim();
  if (!cleaned) return "??";
  const parts = cleaned.split(/[\s\-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Initials avatar with a deterministic color derived from the seed string.
 * No external image fetch — we don't have profile pictures and we don't want
 * to leak emails to Gravatar etc.
 */
export function Avatar({ seed, label, size = "md" }: AvatarProps) {
  const color = PALETTE[hash(seed) % PALETTE.length];
  const text = initials(label ?? seed);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${SIZE[size]}`}
      aria-hidden
    >
      {text}
    </span>
  );
}
