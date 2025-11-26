"use client";

import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  startTime: number;
  endTime: number;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export interface AudioPlayerRef {
  play: () => void;
  pause: () => void;
  restart: () => void;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  function AudioPlayer({ audioUrl, startTime, endTime, autoPlay = true, onEnded }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const hasAutoPlayedRef = useRef(false);
    const hasInitializedRef = useRef(false);
    const isReadyRef = useRef(false);
    const onEndedRef = useRef(onEnded);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      onEndedRef.current = onEnded;
    }, [onEnded]);

    const duration = endTime - startTime;

    useImperativeHandle(ref, () => ({
      play: () => {
        const audio = audioRef.current;
        if (audio && isReady) {
          audio.currentTime = startTime;
          audio.play();
          setIsPlaying(true);
        }
      },
      pause: () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      },
      restart: () => {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = startTime;
          setCurrentTime(0);
          audio.play();
          setIsPlaying(true);
        }
      },
    }));

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      setIsReady(false);
      isReadyRef.current = false;
      setCurrentTime(0);
      setIsPlaying(false);
      hasAutoPlayedRef.current = false;
      hasInitializedRef.current = false;

      let canPlayFired = false;
      let seekCompleted = startTime === 0;

      const checkReadyAndAutoplay = () => {
        if (canPlayFired && seekCompleted && !isReadyRef.current) {
          isReadyRef.current = true;
          setIsReady(true);

          if (autoPlay && !hasAutoPlayedRef.current) {
            hasAutoPlayedRef.current = true;
            audio.play().catch(() => {
              setIsPlaying(false);
            });
          }
        }
      };

      const handleLoadedMetadata = () => {
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          if (startTime > 0) {
            audio.currentTime = startTime;
          }
        }
      };

      const handleSeeked = () => {
        if (hasInitializedRef.current && !seekCompleted) {
          seekCompleted = true;
          checkReadyAndAutoplay();
        }
      };

      const handleCanPlay = () => {
        canPlayFired = true;
        checkReadyAndAutoplay();
      };

      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        const relativeTime = Math.max(0, time - startTime);
        setCurrentTime(relativeTime);

        if (time >= endTime) {
          audio.pause();
          audio.currentTime = startTime;
          setIsPlaying(false);
          setCurrentTime(0);
          onEndedRef.current?.();
        }
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleError = () => {
        console.error("Audio error:", audio.error);
        setIsReady(true);
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("seeked", handleSeeked);
      audio.addEventListener("canplay", handleCanPlay);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("error", handleError);

      audio.load();

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("seeked", handleSeeked);
        audio.removeEventListener("canplay", handleCanPlay);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("error", handleError);
      };
    }, [audioUrl, startTime, endTime, autoPlay]);

    const togglePlay = useCallback(() => {
      const audio = audioRef.current;
      if (!audio || !isReady) return;

      if (isPlaying) {
        audio.pause();
      } else {
        if (audio.currentTime < startTime || audio.currentTime >= endTime) {
          audio.currentTime = startTime;
        }
        audio.play();
      }
    }, [isPlaying, isReady, startTime, endTime]);

    const handleRestart = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = startTime;
      setCurrentTime(0);
      audio.play();
    }, [startTime]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="relative flex items-center gap-3 bg-slate-100 rounded-full px-2 py-2">
        <audio
          ref={audioRef}
          src={`${audioUrl}#t=${startTime}`}
          preload="auto"
        />

        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-slate-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time */}
        <span className="text-xs text-slate-500 tabular-nums">
          {formatTime(currentTime)}
        </span>

        {/* Replay button */}
        <button
          onClick={handleRestart}
          disabled={!isReady}
          className="flex-shrink-0 h-8 w-8 rounded-full text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-50"
          title="Rejouer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Loading overlay */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-full">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="h-4 w-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              Chargement...
            </div>
          </div>
        )}
      </div>
    );
  }
);
