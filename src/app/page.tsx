"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { AudioPlayer, AudioPlayerRef } from "@/components/audio/AudioPlayer";
import { TranscriptEditor } from "@/components/review/TranscriptEditor";
import { OnboardingModal } from "@/components/review/OnboardingModal";
import { FeedbackModal } from "@/components/review/FeedbackModal";
import { AuthModal } from "@/components/review/AuthModal";
import { ModeModal, type AnnotationMode } from "@/components/review/ModeModal";
import { ShortcutsModal } from "@/components/review/ShortcutsModal";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Check,
  SkipForward,
  ExternalLink,
  Settings2,
  Keyboard,
} from "lucide-react";
import { useShortcut } from "@/lib/use-shortcut";
import type { SegmentWithSource, ReviewerSession, WordState } from "@/types/review";
import type { WhisperWord } from "@/types/whisper";

interface ReviewStats {
  totalReviews: number;
  totalCorrections: number;
  remainingSegments: number;
}

type PendingAction =
  | { type: "submit"; isCorrect: boolean }
  | { type: "feedback" };

export default function HomePage() {
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  const prefersReducedMotion = useReducedMotion();
  const [session, setSession] = useState<ReviewerSession | null>(null);
  const [segment, setSegment] = useState<SegmentWithSource | null>(null);
  const [words, setWords] = useState<WordState[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    totalCorrections: 0,
    remainingSegments: 0,
  });
  const [todayReviews, setTodayReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentKey, setSegmentKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>("mixed");

  // Check session on mount (but don't redirect)
  useEffect(() => {
    const sessionData = localStorage.getItem("selaou_session");
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        setSession({
          email: parsed.email,
          totalReviews: parsed.totalReviews || 0,
          totalCorrections: parsed.totalCorrections || 0,
        });
      } catch {
        localStorage.removeItem("selaou_session");
      }
    }

    const hasSeenOnboarding = localStorage.getItem("selaou_onboarding_seen");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    const savedMode = localStorage.getItem("selaou_annotation_mode") as AnnotationMode | null;
    if (savedMode && ["mixed", "easy", "challenge"].includes(savedMode)) {
      setAnnotationMode(savedMode);
    }
  }, []);

  // Refresh today's count for the header tracker (no-op if anonymous)
  const refreshTodayCount = useCallback(async (email: string) => {
    try {
      const res = await fetch(`/api/me/stats?email=${encodeURIComponent(email)}`);
      if (!res.ok) return;
      const data = await res.json();
      setTodayReviews(data.stats?.todayReviews ?? 0);
      setStats((s) => ({
        ...s,
        totalReviews: data.stats?.totalReviews ?? s.totalReviews,
        totalCorrections: data.stats?.totalCorrections ?? s.totalCorrections,
      }));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (session?.email) refreshTodayCount(session.email);
  }, [session?.email, refreshTodayCount]);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("selaou_onboarding_seen", "true");
  };

  const fetchNextSegment = useCallback(async (random = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const emailParam = session?.email ? `email=${encodeURIComponent(session.email)}` : "";
      const randomParam = random ? "random=true" : "";
      const modeParam = `mode=${annotationMode}`;
      const queryParams = [emailParam, randomParam, modeParam].filter(Boolean).join("&");
      const url = `/api/segments/next${queryParams ? `?${queryParams}` : ""}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Erreur lors du chargement du segment");
      }

      const data = await res.json();

      if (data.segment) {
        setSegment(data.segment);
        setSegmentKey((k) => k + 1);

        const whisperData = data.segment.whisperWords as WhisperWord[] | undefined;
        if (whisperData && Array.isArray(whisperData)) {
          setWords(
            whisperData.map((w: WhisperWord, idx: number) => ({
              index: idx,
              original: w.word.trim(),
              current: w.word.trim(),
              isModified: false,
              confidence: w.probability,
              startTime: w.start,
              endTime: w.end,
            }))
          );
        } else {
          const textWords = data.segment.text.split(/\s+/).filter(Boolean);
          setWords(
            textWords.map((w: string, idx: number) => ({
              index: idx,
              original: w,
              current: w,
              isModified: false,
              confidence: 0.8,
            }))
          );
        }
      } else {
        setSegment(null);
        setWords([]);
      }

      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [session?.email, annotationMode]);

  useEffect(() => {
    fetchNextSegment();
  }, [fetchNextSegment]);

  const handleWordUpdate = (index: number, newValue: string) => {
    setWords((prev) =>
      prev.map((w) =>
        w.index === index
          ? { ...w, current: newValue, isModified: newValue !== w.original }
          : w
      )
    );
  };

  const hasModifications = words.some((w) => w.isModified);

  const submitReview = async (email: string, isCorrect: boolean) => {
    if (!segment) return;
    setIsSubmitting(true);

    try {
      const correctedWords = words
        .filter((w) => w.isModified)
        .map((w) => ({
          index: w.index,
          original: w.original,
          corrected: w.current,
        }));

      const correctedText = hasModifications
        ? words.map((w) => w.current).join(" ")
        : undefined;

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentId: segment.id,
          reviewerEmail: email,
          isCorrect,
          correctedText,
          correctedWords: correctedWords.length > 0 ? correctedWords : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la soumission");
      }

      // Optimistic header bump for snappy feedback before /api/me/stats catches up
      setTodayReviews((n) => n + 1);
      setStats((s) => ({
        ...s,
        totalReviews: s.totalReviews + 1,
        totalCorrections: isCorrect ? s.totalCorrections : s.totalCorrections + 1,
      }));

      toast.success(
        isCorrect ? "Validation enregistrée" : "Correction envoyée",
        {
          description: "Merci pour votre contribution.",
          duration: 1800,
        }
      );

      await fetchNextSegment();
      refreshTodayCount(email);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (isCorrect: boolean) => {
    if (!segment) return;

    if (!session?.email) {
      setPendingAction({ type: "submit", isCorrect });
      setShowAuthModal(true);
      return;
    }

    submitReview(session.email, isCorrect);
  };

  const handleSkip = () => {
    fetchNextSegment(true);
  };

  const handleOpenFeedback = () => {
    if (!session?.email) {
      setPendingAction({ type: "feedback" });
      setShowAuthModal(true);
      return;
    }
    setShowFeedback(true);
  };

  const handleModeChange = (mode: AnnotationMode) => {
    setAnnotationMode(mode);
    localStorage.setItem("selaou_annotation_mode", mode);
    toast(
      mode === "mixed" ? "Mode mixte activé" : mode === "easy" ? "Mode facile activé" : "Mode défi activé",
      { duration: 1400 }
    );
  };

  const handleFeedback = async (type: "audio_issue" | "remark", message?: string) => {
    if (!session?.email || !segment) return;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentId: segment.id,
          reviewerEmail: session.email,
          type,
          message,
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'envoi du feedback");
      }

      toast.success(
        type === "audio_issue" ? "Segment signalé" : "Remarque envoyée",
        { duration: 1800 }
      );

      await fetchNextSegment(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const handleAuthenticate = (email: string) => {
    setSession({
      email,
      totalReviews: 0,
      totalCorrections: 0,
    });
    setShowAuthModal(false);

    if (pendingAction) {
      if (pendingAction.type === "submit") {
        submitReview(email, pendingAction.isCorrect);
      } else if (pendingAction.type === "feedback") {
        setShowFeedback(true);
      }
      setPendingAction(null);
    }
  };

  // Keyboard shortcuts. They only fire outside of inputs/textareas (handled by
  // useShortcut), and only when no modal is open (we gate by anyModalOpen).
  const anyModalOpen =
    showOnboarding ||
    showAuthModal ||
    showFeedback ||
    showModeModal ||
    showShortcuts;

  useShortcut({
    key: " ",
    handler: (e) => {
      if (anyModalOpen || !segment) return;
      e.preventDefault();
      const player = audioPlayerRef.current;
      if (!player) return;
      // Play() always restarts from segment beginning per the imperative API.
      // For toggle-to-pause behavior, dispatch a click on the visible button.
      const btn = document.querySelector<HTMLButtonElement>(
        '[data-shortcut="toggle-play"]'
      );
      btn?.click();
    },
  });

  useShortcut({
    key: "r",
    handler: (e) => {
      if (anyModalOpen || !segment) return;
      e.preventDefault();
      audioPlayerRef.current?.restart();
    },
  });

  useShortcut({
    key: "Enter",
    handler: (e) => {
      if (anyModalOpen || !segment || isSubmitting) return;
      e.preventDefault();
      handleSubmit(!hasModifications);
    },
  });

  useShortcut({
    key: "s",
    handler: (e) => {
      if (anyModalOpen || isSubmitting) return;
      e.preventDefault();
      handleSkip();
    },
  });

  useShortcut({
    key: "f",
    handler: (e) => {
      if (anyModalOpen) return;
      e.preventDefault();
      handleOpenFeedback();
    },
  });

  useShortcut({
    key: "?",
    handler: (e) => {
      e.preventDefault();
      setShowShortcuts(true);
    },
  });

  if (isLoading && !segment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !segment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchNextSegment()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <AppHeader
          totalReviews={stats.totalReviews}
          todayReviews={todayReviews}
          onSignInClick={() => setShowAuthModal(true)}
        />
        <div className="flex flex-col items-center justify-center gap-6 px-4 py-20">
          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
          >
            <Check className="h-10 w-10 text-green-600" />
          </motion.div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Merci !</h1>
            <p className="text-slate-500 mb-6">
              Plus de segments à annoter pour le moment.
            </p>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <p className="text-2xl font-bold text-slate-900">{stats.totalReviews}</p>
              <p className="text-slate-500 text-sm">annotations effectuées</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}

      {showAuthModal && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false);
            setPendingAction(null);
          }}
          onAuthenticate={handleAuthenticate}
        />
      )}

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          onSubmit={handleFeedback}
        />
      )}

      {showModeModal && (
        <ModeModal
          currentMode={annotationMode}
          onClose={() => setShowModeModal(false)}
          onSelectMode={handleModeChange}
        />
      )}

      <ShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <AppHeader
        totalReviews={stats.totalReviews}
        todayReviews={todayReviews}
        onSignInClick={() => setShowAuthModal(true)}
      />

      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 flex flex-col min-h-[calc(100vh-3.5rem)]">
        <div className="flex-1 flex flex-col justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={segmentKey}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-4">
              <p className="text-xs text-slate-400 mb-3 uppercase tracking-wide text-center">
                Transcription à vérifier
              </p>
              <div className="text-center">
                <TranscriptEditor words={words} onWordUpdate={handleWordUpdate} />
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">
                Cliquez sur un mot pour le corriger
              </p>
            </div>

            <div className="mb-4 flex justify-center">
              <div className="w-full max-w-xl">
                <AudioPlayer
                  ref={audioPlayerRef}
                  audioUrl={segment.audioSource.audioUrl}
                  startTime={parseFloat(segment.startTime)}
                  endTime={parseFloat(segment.endTime)}
                  autoPlay={true}
                />
              </div>
            </div>

            <div className="text-xs text-slate-400 text-center mb-6 flex items-center justify-center gap-2">
              <span className="truncate">{segment.audioSource.name}</span>
              {segment.audioSource.sourceUrl && (
                <>
                  <span>•</span>
                  <a
                    href={`${segment.audioSource.sourceUrl}#t=${Math.floor(parseFloat(segment.startTime))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                  >
                    Source
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          <AnimatePresence mode="wait" initial={false}>
            {!hasModifications ? (
              <motion.div
                key="validate"
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="flex-1"
              >
                <Button
                  size="lg"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="w-full h-14 text-base font-medium text-white bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-emerald-600/40 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      C&apos;est correct
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="correct"
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="flex-1"
              >
                <Button
                  size="lg"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="w-full h-14 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.25),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-blue-700/30 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Envoyer mes corrections
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            size="lg"
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="h-14 px-4 text-slate-500"
            title="Passer ce segment (S)"
          >
            <SkipForward className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">Passer</span>
          </Button>
        </div>

        {/* Subtle shortcut hint — visible enough to teach, faded enough to ignore */}
        <div className="hidden sm:flex items-center justify-center gap-1.5 mt-3 text-[11px] text-slate-400">
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm">
            Entrée
          </kbd>
          <span>pour valider</span>
          <span className="text-slate-300">·</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm">
            Espace
          </kbd>
          <span>écouter</span>
          <span className="text-slate-300">·</span>
          <button
            onClick={() => setShowShortcuts(true)}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors underline-offset-2 hover:underline"
            title="Voir tous les raccourcis (?)"
          >
            <Keyboard className="h-3 w-3" />
            tout voir
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={handleOpenFeedback}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
          >
            Signaler un problème
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => setShowModeModal(true)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
          >
            <Settings2 className="h-3 w-3" />
            Mode : {annotationMode === "mixed" ? "Mixte" : annotationMode === "easy" ? "Facile" : "Défi"}
          </button>
        </div>
        </div>
      </main>
    </div>
  );
}
