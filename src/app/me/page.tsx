"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Flame,
  Headphones,
  Loader2,
  LogOut,
  PenLine,
  Save,
  Trophy,
  Users2,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatTile } from "@/components/profile/StatTile";
import { ActivityHeatmap } from "@/components/profile/ActivityHeatmap";
import { MilestoneBadge } from "@/components/profile/MilestoneBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { formatAudioDuration, formatCount } from "@/lib/utils";
import { summarizeMilestones, MILESTONES } from "@/lib/milestones";

interface MeStats {
  profile: {
    email: string;
    displayName: string | null;
    isPublic: boolean;
    memberSince: string | null;
    lastActiveAt: string | null;
  };
  stats: {
    totalReviews: number;
    totalCorrections: number;
    audioSeconds: number;
    activeDays: number;
    todayReviews: number;
    rank: number | null;
  };
  heatmap: Array<{ day: string; count: number }>;
  recentReviews: Array<{
    id: string;
    isCorrect: boolean;
    createdAt: string;
    segmentText: string;
    sourceName: string;
  }>;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MePage() {
  const router = useRouter();
  const { session, hydrated, signOut } = useSession();
  const prefersReducedMotion = useReducedMotion();

  const [data, setData] = useState<MeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings local state
  const [displayName, setDisplayName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/me/stats?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        throw new Error("Impossible de charger votre profil");
      }
      const json: MeStats = await res.json();
      setData(json);
      setDisplayName(json.profile.displayName ?? "");
      setIsPublic(json.profile.isPublic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!session?.email) {
      router.replace("/");
      return;
    }
    load(session.email);
  }, [hydrated, session?.email, router, load]);

  const saveSettings = async () => {
    if (!session?.email || !data) return;
    const trimmed = displayName.trim();
    const changedName = trimmed !== (data.profile.displayName ?? "");
    const changedPublic = isPublic !== data.profile.isPublic;
    if (!changedName && !changedPublic) {
      toast("Aucun changement à enregistrer");
      return;
    }
    setSavingSettings(true);
    try {
      const res = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.email,
          ...(changedName ? { displayName: trimmed } : {}),
          ...(changedPublic ? { isPublic } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Erreur lors de la sauvegarde");
      }
      toast.success("Profil mis à jour");
      setData((prev) =>
        prev
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                displayName: json.profile.displayName,
                isPublic: json.profile.isPublic,
              },
            }
          : prev
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    toast("Vous êtes déconnecté", { duration: 1400 });
    router.replace("/");
  };

  if (!hydrated || (isLoading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 mb-4">{error ?? "Erreur inconnue"}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const { profile, stats } = data;
  const { achieved, upcoming } = summarizeMilestones({
    totalReviews: stats.totalReviews,
    totalCorrections: stats.totalCorrections,
    audioSeconds: stats.audioSeconds,
    activeDays: stats.activeDays,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader totalReviews={stats.totalReviews} todayReviews={stats.todayReviews} />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l&apos;annotation
        </Link>

        {/* Profile header */}
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Mon espace
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {profile.displayName ?? "Annotateur"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {profile.email} · membre depuis {formatRelative(profile.memberSince)}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 text-sm">
              {stats.rank !== null && profile.isPublic && (
                <Link
                  href="/contributeurs"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1.5 text-blue-700"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="font-semibold">{stats.rank}<sup>e</sup></span>
                  <span className="text-blue-600/80">au classement</span>
                </Link>
              )}
              {!profile.isPublic && (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-500 text-xs">
                  Profil masqué du classement
                </span>
              )}
            </div>
          </div>
        </motion.section>

        {/* Stat tiles */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            icon={CheckCircle2}
            label="Annotations"
            value={stats.totalReviews}
            format={formatCount}
            accent="blue"
          />
          <StatTile
            icon={PenLine}
            label="Corrections"
            value={stats.totalCorrections}
            format={formatCount}
            accent="amber"
          />
          <StatTile
            icon={Headphones}
            label="Audio breton"
            value={stats.audioSeconds}
            format={formatAudioDuration}
            accent="green"
            hint="cumulés"
          />
          <StatTile
            icon={Flame}
            label="Jours actifs"
            value={stats.activeDays}
            format={formatCount}
            accent="slate"
          />
        </section>

        {/* Heatmap */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Activité sur 3 mois
            </h2>
            <span className="text-xs text-slate-400 inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {stats.todayReviews > 0
                ? `${stats.todayReviews} aujourd'hui`
                : "Pas encore aujourd'hui"}
            </span>
          </div>
          <ActivityHeatmap data={data.heatmap} />
        </section>

        {/* Milestones */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Étapes franchies
            </h2>
            <span className="text-xs text-slate-400">
              {achieved.length} / {MILESTONES.length}
            </span>
          </div>
          {achieved.length === 0 ? (
            <p className="text-sm text-slate-500">
              Vos premières étapes apparaîtront ici dès vos premières annotations.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achieved.map((m) => (
                <MilestoneBadge key={m.id} milestone={m} achieved />
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-wide text-slate-400 mt-6 mb-3">
                Prochaines étapes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcoming.map(({ milestone, progress }) => (
                  <MilestoneBadge
                    key={milestone.id}
                    milestone={milestone}
                    achieved={false}
                    progress={progress}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Recent activity */}
        {data.recentReviews.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Dernières annotations
            </h2>
            <ul className="space-y-3">
              {data.recentReviews.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start gap-3 text-sm border-b border-slate-100 last:border-0 pb-3 last:pb-0"
                >
                  <span
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      r.isCorrect ? "bg-green-500" : "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-700 line-clamp-1">{r.segmentText}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {r.isCorrect ? "Validé" : "Corrigé"} ·{" "}
                      <span className="truncate">{r.sourceName}</span> ·{" "}
                      {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Settings */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Réglages
          </h2>
          <div className="space-y-5">
            <div>
              <Label htmlFor="display-name" className="text-xs text-slate-500">
                Pseudo public
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                placeholder="Annotateur"
                className="mt-1.5"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                C&apos;est le nom affiché sur le classement public.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
              <span className="relative inline-flex items-center mt-0.5">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span className="h-5 w-9 rounded-full bg-slate-300 peer-checked:bg-blue-600 transition-colors" />
                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white peer-checked:translate-x-4 transition-transform shadow-sm" />
              </span>
              <span className="flex-1 text-sm">
                <span className="font-medium text-slate-800 flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" />
                  Apparaître dans le classement public
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Vos annotations restent toujours comptabilisées dans le projet, mais votre pseudo n&apos;est plus listé sur la page Contributeurs.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                onClick={saveSettings}
                disabled={savingSettings}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Se déconnecter
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
