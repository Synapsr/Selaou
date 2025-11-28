"use client";

import { X, Zap, Scale, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AnnotationMode = "mixed" | "easy" | "challenge";

interface ModeOption {
  id: AnnotationMode;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const modes: ModeOption[] = [
  {
    id: "mixed",
    name: "Mixte",
    description: "Un peu de tout : segments faciles et plus difficiles melanges",
    icon: <Scale className="h-5 w-5" />,
  },
  {
    id: "easy",
    name: "Facile",
    description: "Segments avec haute confiance - ideal pour valider rapidement",
    icon: <Zap className="h-5 w-5" />,
  },
  {
    id: "challenge",
    name: "Defi",
    description: "Segments incertains qui ont le plus besoin de votre aide",
    icon: <Shield className="h-5 w-5" />,
  },
];

interface ModeModalProps {
  currentMode: AnnotationMode;
  onClose: () => void;
  onSelectMode: (mode: AnnotationMode) => void;
}

export function ModeModal({ currentMode, onClose, onSelectMode }: ModeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">Mode d&apos;annotation</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-600 mb-4">
            Choisissez le type de segments que vous souhaitez annoter.
          </p>

          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                onSelectMode(mode.id);
                onClose();
              }}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                currentMode === mode.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  currentMode === mode.id
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {mode.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{mode.name}</span>
                  {currentMode === mode.id && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                      Actif
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{mode.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
