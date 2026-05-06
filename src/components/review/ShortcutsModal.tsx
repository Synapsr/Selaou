"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["Espace"], label: "Lecture / Pause" },
  { keys: ["R"], label: "Réécouter le segment" },
  { keys: ["Entrée"], label: "Valider ou envoyer la correction" },
  { keys: ["S"], label: "Passer ce segment" },
  { keys: ["F"], label: "Signaler un problème" },
  { keys: ["?"], label: "Afficher cette aide" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 shadow-sm">
      {children}
    </kbd>
  );
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { y: 12, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Raccourcis clavier
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="px-5 py-4 space-y-3">
              {SHORTCUTS.map(({ keys, label }) => (
                <li key={label} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="flex items-center gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] text-slate-500">
              Les raccourcis sont désactivés pendant l&apos;édition d&apos;un mot.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
