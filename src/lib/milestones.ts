/**
 * Badge / milestone definitions.
 *
 * The whole gamification layer is intentionally low-key: each badge celebrates
 * a contribution to the breton language, not a raw score. No streaks, no
 * levels, no XP — these would push the product toward the wrong tone.
 */

import {
  Award,
  BookOpen,
  Compass,
  Footprints,
  Headphones,
  Mountain,
  PenLine,
  ShieldCheck,
  Sparkles,
  Star,
  Sunrise,
  type LucideIcon,
} from "lucide-react";

export interface MilestoneStats {
  totalReviews: number;
  totalCorrections: number;
  audioSeconds: number;
  activeDays: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  achieved: (s: MilestoneStats) => boolean;
  /** Progression in [0,1] — used to render the locked card progress bar. */
  progress: (s: MilestoneStats) => number;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export const MILESTONES: Milestone[] = [
  {
    id: "first-step",
    title: "Premiers pas",
    description: "Première annotation enregistrée.",
    icon: Footprints,
    achieved: (s) => s.totalReviews >= 1,
    progress: (s) => clamp(s.totalReviews / 1),
  },
  {
    id: "ten-segments",
    title: "Dix segments",
    description: "Dix annotations validées ou corrigées.",
    icon: Sunrise,
    achieved: (s) => s.totalReviews >= 10,
    progress: (s) => clamp(s.totalReviews / 10),
  },
  {
    id: "fifty-segments",
    title: "Cinquante segments",
    description: "Cinquante segments passés au peigne fin.",
    icon: BookOpen,
    achieved: (s) => s.totalReviews >= 50,
    progress: (s) => clamp(s.totalReviews / 50),
  },
  {
    id: "hundred-segments",
    title: "Cent segments",
    description: "Une centaine d'annotations contribuées.",
    icon: Star,
    achieved: (s) => s.totalReviews >= 100,
    progress: (s) => clamp(s.totalReviews / 100),
  },
  {
    id: "five-hundred-segments",
    title: "Cinq cents segments",
    description: "Une vraie habitude — 500 annotations.",
    icon: Award,
    achieved: (s) => s.totalReviews >= 500,
    progress: (s) => clamp(s.totalReviews / 500),
  },
  {
    id: "one-thousand-segments",
    title: "Mille segments",
    description: "Pilier du dataset breton.",
    icon: Mountain,
    achieved: (s) => s.totalReviews >= 1000,
    progress: (s) => clamp(s.totalReviews / 1000),
  },
  {
    id: "five-min-audio",
    title: "5 minutes sauvegardées",
    description: "Cinq minutes d'audio breton fiabilisées.",
    icon: Headphones,
    achieved: (s) => s.audioSeconds >= 5 * 60,
    progress: (s) => clamp(s.audioSeconds / (5 * 60)),
  },
  {
    id: "thirty-min-audio",
    title: "30 minutes sauvegardées",
    description: "Une demi-heure d'audio breton fiabilisée.",
    icon: ShieldCheck,
    achieved: (s) => s.audioSeconds >= 30 * 60,
    progress: (s) => clamp(s.audioSeconds / (30 * 60)),
  },
  {
    id: "one-hour-audio",
    title: "Une heure sauvegardée",
    description: "Soixante minutes d'audio breton fiabilisées.",
    icon: Sparkles,
    achieved: (s) => s.audioSeconds >= 60 * 60,
    progress: (s) => clamp(s.audioSeconds / (60 * 60)),
  },
  {
    id: "first-correction",
    title: "Première correction",
    description: "Une transcription affinée à la main.",
    icon: PenLine,
    achieved: (s) => s.totalCorrections >= 1,
    progress: (s) => clamp(s.totalCorrections / 1),
  },
  {
    id: "fifty-corrections",
    title: "Cinquante corrections",
    description: "Cinquante reformulations de transcriptions imparfaites.",
    icon: PenLine,
    achieved: (s) => s.totalCorrections >= 50,
    progress: (s) => clamp(s.totalCorrections / 50),
  },
  {
    id: "explorer",
    title: "Explorateur",
    description: "Cinq jours d'activité sur le projet.",
    icon: Compass,
    achieved: (s) => s.activeDays >= 5,
    progress: (s) => clamp(s.activeDays / 5),
  },
];

export function summarizeMilestones(stats: MilestoneStats) {
  const achieved = MILESTONES.filter((m) => m.achieved(stats));
  const upcoming = MILESTONES.filter((m) => !m.achieved(stats))
    .map((m) => ({ milestone: m, progress: m.progress(stats) }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
  return { achieved, upcoming };
}
