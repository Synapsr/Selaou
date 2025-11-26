"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, MessageSquare, Loader2 } from "lucide-react";

interface FeedbackModalProps {
  onClose: () => void;
  onSubmit: (type: "audio_issue" | "remark", message?: string) => Promise<void>;
}

export function FeedbackModal({ onClose, onSubmit }: FeedbackModalProps) {
  const [step, setStep] = useState<"choice" | "remark">("choice");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAudioIssue = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit("audio_issue");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemarkSubmit = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit("remark", message.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-slate-900">
            {step === "choice" ? "Signaler un problème" : "Ajouter une remarque"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === "choice" ? (
            <div className="space-y-3">
              <button
                onClick={handleAudioIssue}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-4 rounded-xl border hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 text-red-500 animate-spin flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-slate-900">Problème audio</p>
                  <p className="text-sm text-slate-500">
                    L&apos;audio n&apos;est pas lisible ou ne correspond pas au texte
                  </p>
                </div>
              </button>

              <button
                onClick={() => setStep("remark")}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-4 rounded-xl border hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
              >
                <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Faire une remarque</p>
                  <p className="text-sm text-slate-500">
                    Ajouter un commentaire et passer au suivant
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez votre remarque..."
                className="w-full h-32 p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("choice")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleRemarkSubmit}
                  disabled={isSubmitting || !message.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Envoyer"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
