"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Headphones, LogIn, Trophy, User } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSession } from "@/lib/session";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface AppHeaderProps {
  /**
   * Optional override for the connected user's review counter. When omitted
   * the header fetches `/api/me/stats` itself so any page can mount it without
   * worrying about wiring data.
   */
  totalReviews?: number;
  todayReviews?: number;
  onSignInClick?: () => void;
}

export function AppHeader({
  totalReviews,
  todayReviews,
  onSignInClick,
}: AppHeaderProps) {
  const { session, hydrated } = useSession();
  const prefersReducedMotion = useReducedMotion();
  const [fetched, setFetched] = useState<{
    total: number;
    today: number;
  } | null>(null);

  useEffect(() => {
    if (!session?.email) {
      setFetched(null);
      return;
    }
    if (totalReviews !== undefined && todayReviews !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/me/stats?email=${encodeURIComponent(session.email)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setFetched({
          total: data.stats.totalReviews ?? 0,
          today: data.stats.todayReviews ?? 0,
        });
      } catch {
        // silent — the header tracker is a nice-to-have
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.email, totalReviews, todayReviews]);

  const total = totalReviews ?? fetched?.total ?? 0;
  const today = todayReviews ?? fetched?.today ?? 0;

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-slate-900 transition-colors hover:text-blue-600"
        >
          <motion.span
            initial={prefersReducedMotion ? false : { rotate: -8, scale: 0.9 }}
            animate={prefersReducedMotion ? undefined : { rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="inline-flex"
          >
            <Headphones className="h-5 w-5 text-blue-500" />
          </motion.span>
          <span>Selaou</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3 text-sm">
          <Link
            href="/contributeurs"
            className="hidden sm:inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
          >
            <Trophy className="h-4 w-4" />
            Contributeurs
          </Link>

          {!hydrated ? null : session?.email ? (
            <Link
              href="/me"
              className="group flex items-center gap-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1.5"
              title="Mon espace"
            >
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-blue-700 hidden sm:inline">Vos annotations :</span>
              <AnimatedCounter
                value={total}
                className="font-semibold text-blue-700 tabular-nums"
              />
              {today > 0 && (
                <motion.span
                  initial={prefersReducedMotion ? false : { opacity: 0, y: -3 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  className="ml-1 hidden sm:inline-flex items-center text-[11px] font-medium text-blue-600/80 bg-white/80 rounded-full px-1.5 py-0.5"
                >
                  +{today} aujourd&apos;hui
                </motion.span>
              )}
            </Link>
          ) : (
            <button
              onClick={onSignInClick}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
            >
              <LogIn className="h-4 w-4" />
              <span>Me connecter</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
