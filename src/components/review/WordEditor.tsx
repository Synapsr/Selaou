"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X, Trash2 } from "lucide-react";
import type { WordState } from "@/types/review";

interface WordEditorProps {
  word: WordState;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function WordEditor({ word, onSave, onCancel, onDelete }: WordEditorProps) {
  const [value, setValue] = useState(word.current);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave(value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <span className="inline-flex items-center gap-0.5 rounded-xl bg-white border-2 border-blue-500 p-1 shadow-xl">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 w-28 px-2 text-base rounded-lg bg-slate-50 border-0 outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="Correction..."
      />
      <button
        type="button"
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-green-100 transition-colors"
        onClick={() => onSave(value.trim())}
        title="Valider (Entree)"
      >
        <Check className="h-4 w-4 text-green-600" />
      </button>
      <button
        type="button"
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
        onClick={onCancel}
        title="Annuler (Echap)"
      >
        <X className="h-4 w-4 text-slate-500" />
      </button>
      <button
        type="button"
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-100 transition-colors"
        onClick={onDelete}
        title="Supprimer le mot"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>
    </span>
  );
}
