"use client";

import { useEffect } from "react";

type Handler = (event: KeyboardEvent) => void;

interface ShortcutOptions {
  /** Lower-cased key name. Use "?" for shift-slash. */
  key: string;
  handler: Handler;
  /** Skip when the user is typing in an input/textarea/contentEditable. Default: true. */
  ignoreWhenTyping?: boolean;
  /** Allow the shortcut even with modifiers (cmd/ctrl/alt). Default: false. */
  allowWithModifiers?: boolean;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Register a single keyboard shortcut. Skips automatically when the user is
 * typing into an input/textarea so power-user shortcuts never interfere with
 * regular text entry.
 */
export function useShortcut({
  key,
  handler,
  ignoreWhenTyping = true,
  allowWithModifiers = false,
}: ShortcutOptions) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (ignoreWhenTyping && isTyping(event.target)) return;
      if (!allowWithModifiers && (event.metaKey || event.ctrlKey || event.altKey))
        return;

      const pressed = event.key.toLowerCase();
      if (pressed === key.toLowerCase()) {
        handler(event);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, handler, ignoreWhenTyping, allowWithModifiers]);
}
