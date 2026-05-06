"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { formatCount } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Tween a number on mount and on every value change. Falls back to the raw
 * value when the user prefers reduced motion. Used for the header tracker
 * and stat tiles — keeps the interaction physical without flashy reveals.
 */
export function AnimatedCounter({
  value,
  duration = 0.6,
  format = formatCount,
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      previous.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
      onComplete: () => {
        previous.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration, prefersReducedMotion]);

  return <span className={className}>{format(display)}</span>;
}
