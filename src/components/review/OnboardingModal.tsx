"use client";

import { useState } from "react";
import { X, Check, Edit3, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Headphones,
      title: "Bienvenue sur Selaou !",
      description:
        "Merci de contribuer a ameliorer la transcription automatique du breton. Votre aide est precieuse pour preserver notre langue.",
    },
    {
      icon: Headphones,
      title: "Ecoutez l'audio",
      description:
        "Un extrait audio se lance automatiquement. Ecoutez attentivement ce qui est dit.",
    },
    {
      icon: Edit3,
      title: "Corrigez si necessaire",
      description:
        "Comparez avec le texte affiche. Si un mot est incorrect, cliquez dessus pour le corriger. Les mots en orange ou rouge sont moins fiables.",
    },
    {
      icon: Check,
      title: "Validez ou passez",
      description:
        'Si le texte est correct, appuyez sur "C\'est correct". Si vous avez fait des corrections, appuyez sur "Valider les corrections". Pour passer, utilisez la fleche.',
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="h-5 w-5 text-slate-400" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 mb-3">
            {currentStep.title}
          </h2>

          {/* Description */}
          <p className="text-slate-600 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? "w-6 bg-blue-600" : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Precedent
              </Button>
            )}
            <Button
              onClick={() => {
                if (isLast) {
                  onClose();
                } else {
                  setStep(step + 1);
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLast ? "C'est parti !" : "Suivant"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
