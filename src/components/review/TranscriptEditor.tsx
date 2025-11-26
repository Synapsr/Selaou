"use client";

import { useState } from "react";
import { cn, getConfidenceClass } from "@/lib/utils";
import { WordEditor } from "./WordEditor";
import type { WordState } from "@/types/review";

interface TranscriptEditorProps {
  words: WordState[];
  onWordUpdate: (index: number, newValue: string) => void;
}

export function TranscriptEditor({ words, onWordUpdate }: TranscriptEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
          // Skip deleted words (empty string)
          if (word.current === "") return null;

          const isEditing = editingIndex === idx;

          return (
            <span key={idx} className="relative inline">
              {isEditing ? (
                <WordEditor
                  word={word}
                  onSave={(newValue) => handleWordSave(idx, newValue)}
                  onCancel={handleWordCancel}
                  onDelete={() => handleWordDelete(idx)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleWordClick(idx)}
                  className={cn(
                    "rounded-md px-1 py-0.5 transition-all hover:bg-slate-100 hover:scale-105",
                    getConfidenceClass(word.confidence),
                    word.isModified && "word-modified font-medium"
                  )}
                >
                  {word.current}
                </button>
              )}
              {idx < words.length - 1 && " "}
            </span>
          );
        })}
      </p>
    </div>
  );
}
