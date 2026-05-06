"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn, getConfidenceClass } from "@/lib/utils";
import { WordEditor } from "./WordEditor";
import type { WordState } from "@/types/review";

interface TranscriptEditorProps {
  words: WordState[];
  onWordUpdate: (index: number, newValue: string) => void;
}

export function TranscriptEditor({ words, onWordUpdate }: TranscriptEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const handleWordClick = (index: number) => {
    setEditingIndex(index);
  };

  const handleWordSave = (index: number, newValue: string) => {
    onWordUpdate(index, newValue);
    setEditingIndex(null);
  };

  const handleWordCancel = () => {
    setEditingIndex(null);
  };

  const handleWordDelete = (index: number) => {
    onWordUpdate(index, "");
    setEditingIndex(null);
  };

  return (
    <div>
      <p className="text-xl leading-loose text-slate-800">
        {words.map((word, idx) => {
          if (word.current === "") return null;

          const isEditing = editingIndex === idx;

          return (
            <span key={idx} className="relative inline">
              <AnimatePresence mode="wait" initial={false}>
                {isEditing ? (
                  <motion.span
                    key="editor"
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="inline-flex"
                  >
                    <WordEditor
                      word={word}
                      onSave={(newValue) => handleWordSave(idx, newValue)}
                      onCancel={handleWordCancel}
                      onDelete={() => handleWordDelete(idx)}
                    />
                  </motion.span>
                ) : (
                  <motion.button
                    key="word"
                    layout="position"
                    type="button"
                    onClick={() => handleWordClick(idx)}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.06, y: -1 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                      "rounded-md px-1 py-0.5 transition-colors hover:bg-slate-100",
                      getConfidenceClass(word.confidence),
                      word.isModified && "word-modified font-medium"
                    )}
                  >
                    {word.current}
                  </motion.button>
                )}
              </AnimatePresence>
              {idx < words.length - 1 && " "}
            </span>
          );
        })}
      </p>
    </div>
  );
}
