"use client";

import { useEffect, useState, useCallback } from "react";

export interface ClientSession {
  email: string;
  startedAt?: string;
}

const KEY = "selaou_session";

function read(): ClientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email) return null;
    return { email: parsed.email, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

export function useSession() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(read());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSession(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(KEY);
    setSession(null);
  }, []);

  const signIn = useCallback((email: string) => {
    const next: ClientSession = { email, startedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  return { session, hydrated, signIn, signOut };
}
