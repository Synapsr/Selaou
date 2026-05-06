"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  Headphones,
  Loader2,
  Medal,
  PenLine,
  Trophy,
  Users2,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { useSession } from "@/lib/session";
import { formatAudioDuration, formatCount, cn } from "@/lib/utils";

type Period = "week" | "month" | "all";

interface LeaderboardRow {
  rank: number;
  displayName: string;
  memberSince: string | null;
  reviewCount: number;
  correctionCount: number;
  audioSeconds: number;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  period: Period;
  leaderboard: LeaderboardRow[];
  global: {
    contributors: number;
    reviews: number;
    corrections: number;
    audioSeconds: number;
  };
  currentUser: {
    rank: number;
    displayName: string;
    reviewCount: number;
    correctionCount: number;
    audioSeconds: number;
    isPublic: boolean;
  } | null;
}

const TABS: Array<{ value: Period; label: string }> = [
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "all", label: "Depuis le début" },
];

function rankBadge(rank: number) {
  if (rank === 1)
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <Crown className="h-4 w-4" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600">
        <Medal className="h-4 w-4" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
        <Medal className="h-4 w-4" />
      </span>
    );
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 text-sm font-semibold tabular-nums">
      {rank}
    </span>
  );
}

export default function ContributeursPage() {
  const { session } = useSession();
  const prefersReducedMotion = useReducedMotion();
  const [period, setPeriod] = useState<Period>("all");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(
    async (p: Period, email?: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ period: p });
        if (email) params.set("email", email);
        const res = await fetch(`/api/leaderboard?${params.toString()}`);
        if (!res.ok) throw new Error("Erreur lors du chargement");
        setData(await res.json());
      } catch {
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(period, session?.email);
  }, [period, session?.email, load]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l&apos;annotation
        </Link>

        {/* Hero with global stats */}
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-white p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Contributeurs
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Les personnes qui font vivre le dataset breton, ensemble.
              </p>
            </div>
          </div>

          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <GlobalStat
                icon={Users2}
                label="Contributeurs"
                value={formatCount(data.global.contributors)}
              />
              <GlobalStat
                icon={Trophy}
                label="Annotations"
                value={formatCount(data.global.reviews)}
              />
              <GlobalStat
                icon={PenLine}
                label="Corrections"
                value={formatCount(data.global.corrections)}
              />
              <GlobalStat
                icon={Headphones}
                label="Audio fiabilisé"
                value={formatAudioDuration(data.global.audioSeconds)}
              />
            </div>
          )}
        </motion.section>

        {/* Period tabs */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-full w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className={cn(
                "relative px-4 py-1.5 text-sm rounded-full transition-colors",
                period === tab.value
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {period === tab.value && (
                <motion.span
                  layoutId="period-pill"
                  className="absolute inset-0 bg-blue-600 rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Leaderboard list */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : !data || data.leaderboard.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-slate-500 text-sm">
                Aucun contributeur pour cette période.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm"
              >
                Soyez le premier à contribuer →
              </Link>
            </div>
          ) : (
            <ul>
              <AnimatePresence initial={false}>
                {data.leaderboard.map((row, idx) => (
                  <motion.li
                    key={`${period}-${row.displayName}-${row.rank}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                    transition={{ delay: prefersReducedMotion ? 0 : idx * 0.015 }}
                    className={cn(
                      "flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-100 last:border-0 transition-colors",
                      row.isCurrentUser
                        ? "bg-blue-50/50"
                        : "hover:bg-slate-50"
                    )}
                  >
                    {rankBadge(row.rank)}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm truncate",
                          row.isCurrentUser
                            ? "font-semibold text-blue-700"
                            : "font-medium text-slate-800"
                        )}
                      >
                        {row.displayName}
                        {row.isCurrentUser && (
                          <span className="ml-2 text-[11px] uppercase tracking-wide text-blue-500">
                            vous
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatCount(row.reviewCount)} annotation
                        {row.reviewCount > 1 ? "s" : ""}
                        {row.correctionCount > 0 && (
                          <> · {formatCount(row.correctionCount)} correction{row.correctionCount > 1 ? "s" : ""}</>
                        )}
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatAudioDuration(row.audioSeconds)}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {/* Sticky "you are #X" footer when out of top N */}
        {data?.currentUser &&
          !data.leaderboard.some((r) => r.isCurrentUser) &&
          data.currentUser.rank > 0 &&
          data.currentUser.isPublic && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 flex items-center gap-3"
            >
              {rankBadge(data.currentUser.rank)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-blue-700">
                  {data.currentUser.displayName}
                  <span className="ml-2 text-[11px] uppercase tracking-wide text-blue-500">
                    vous
                  </span>
                </p>
                <p className="text-xs text-blue-600/80 mt-0.5">
                  {formatCount(data.currentUser.reviewCount)} annotation
                  {data.currentUser.reviewCount > 1 ? "s" : ""} sur la période
                </p>
              </div>
              <span className="hidden sm:inline-flex text-xs text-blue-600/80 tabular-nums whitespace-nowrap">
                {formatAudioDuration(data.currentUser.audioSeconds)}
              </span>
            </motion.div>
          )}

        {data?.currentUser && !data.currentUser.isPublic && (
          <p className="text-xs text-slate-400 text-center">
            Votre profil est masqué du classement.{" "}
            <Link href="/me" className="text-blue-600 hover:text-blue-700">
              Réglages
            </Link>
          </p>
        )}

        {!session?.email && (
          <div className="text-center py-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              Annoter pour rejoindre le classement →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function GlobalStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/80 border border-slate-200/60 backdrop-blur-sm p-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}
