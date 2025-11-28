"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AudioPlayer, AudioPlayerRef } from "@/components/audio/AudioPlayer";
import { TranscriptEditor } from "@/components/review/TranscriptEditor";
import { OnboardingModal } from "@/components/review/OnboardingModal";
import { FeedbackModal } from "@/components/review/FeedbackModal";
import { Button } from "@/components/ui/button";
import { Loader2, Check, SkipForward, Headphones, ExternalLink } from "lucide-react";
import type { SegmentWithSource, ReviewerSession, WordState } from "@/types/review";
import type { WhisperWord } from "@/types/whisper";

interface ReviewStats {
  totalReviews: number;
  totalCorrections: number;
  remainingSegments: number;
}

export default function ReviewPage() {
  const router = useRouter();
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  const [session, setSession] = useState<ReviewerSession | null>(null);
  const [segment, setSegment] = useState<SegmentWithSource | null>(null);
  const [words, setWords] = useState<WordState[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    totalCorrections: 0,
    remainingSegments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentKey, setSegmentKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Check session on mount
  useEffect(() => {
    const sessionData = localStorage.getItem("selaou_session");
    if (!sessionData) {
      router.push("/");
      return;
    }

    try {
      const parsed = JSON.parse(sessionData);
      setSession({
        email: parsed.email,
        totalReviews: parsed.totalReviews || 0,
        totalCorrections: parsed.totalCorrections || 0,
      });

      // Show onboarding for first-time users
      const hasSeenOnboarding = localStorage.getItem("selaou_onboarding_seen");
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    } catch {
      router.push("/");
    }
  }, [router]);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("selaou_onboarding_seen", "true");
  };

  // Fetch next segment
  const fetchNextSegment = useCallback(async (random = false) => {
    if (!session?.email) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/segments/next?email=${encodeURIComponent(session.email)}${random ? "&random=true" : ""}`;
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
  }, [session?.email]);

  // Fetch segment when session is ready
  useEffect(() => {
    if (session?.email) {
      fetchNextSegment();
    }
  }, [session?.email, fetchNextSegment]);

  // Handle word update
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

  // Submit review
  const handleSubmit = async (isCorrect: boolean) => {
    if (!session?.email || !segment) return;

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
          reviewerEmail: session.email,
          isCorrect,
          correctedText,
          correctedWords: correctedWords.length > 0 ? correctedWords : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la soumission");
      }

      // Fetch next segment (stats will be updated from API response)
      await fetchNextSegment();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    fetchNextSegment(true);
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

      // Fetch next segment after feedback
      await fetchNextSegment(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchNextSegment()}>Reessayer</Button>
        </div>
      </div>
    );
  }

  // No more segments
  if (!segment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Merci !</h1>
          <p className="text-slate-500 mb-6">
            Plus de segments a annoter pour le moment.
          </p>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <p className="text-2xl font-bold text-slate-900">{stats.totalReviews}</p>
            <p className="text-slate-500 text-sm">annotations effectuees</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Onboarding Modal */}
      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}

      {/* Feedback Modal */}
      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          onSubmit={handleFeedback}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-slate-900">Selaou</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Vos annotations :</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {stats.totalReviews}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Transcript - Priority content */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-4">
          <p className="text-xs text-slate-400 mb-3 uppercase tracking-wide">
            Transcription a verifier
          </p>
          <TranscriptEditor words={words} onWordUpdate={handleWordUpdate} />
          <p className="text-xs text-slate-400 mt-4">
            Cliquez sur un mot pour le corriger
          </p>
        </div>

        {/* Audio Player - Compact */}
        <div className="mb-4">
          <AudioPlayer
            key={segmentKey}
            ref={audioPlayerRef}
            audioUrl={segment.audioSource.audioUrl}
            startTime={parseFloat(segment.startTime)}
            endTime={parseFloat(segment.endTime)}
            autoPlay={true}
          />
        </div>

        {/* Episode info */}
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

        {/* Actions - Clear buttons */}
        <div className="flex gap-3">
          {!hasModifications ? (
            <Button
              size="lg"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="flex-1 h-14 text-base bg-green-600 hover:bg-green-700"
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
          ) : (
            <Button
              size="lg"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex-1 h-14 text-base bg-blue-600 hover:bg-blue-700"
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
          )}

          <Button
            size="lg"
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="h-14 px-4 text-slate-500"
            title="Passer ce segment"
          >
            <SkipForward className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">Passer</span>
          </Button>
        </div>

        {/* Feedback link */}
        <div className="text-center mt-4">
          <button
            onClick={() => setShowFeedback(true)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
          >
            Signaler un problème
          </button>
        </div>
      </main>
    </div>
  );
}
