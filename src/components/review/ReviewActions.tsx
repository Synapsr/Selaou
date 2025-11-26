"use client";

import { Check, Send, SkipForward, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewActionsProps {
  hasModifications: boolean;
  isSubmitting: boolean;
  onValidate: () => void;
  onSubmitCorrections: () => void;
  onSkip: () => void;
}

export function ReviewActions({
  hasModifications,
  isSubmitting,
  onValidate,
  onSubmitCorrections,
  onSkip,
}: ReviewActionsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      {!hasModifications ? (
        <Button
          size="lg"
          variant="success"
          onClick={onValidate}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none sm:min-w-[200px]"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Check className="mr-2 h-5 w-5" />
          )}
          C&apos;est correct
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={onSubmitCorrections}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none sm:min-w-[200px]"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Send className="mr-2 h-5 w-5" />
          )}
          Soumettre corrections
        </Button>
      )}

      <Button
        size="lg"
        variant="outline"
        onClick={onSkip}
        disabled={isSubmitting}
        className="flex-1 sm:flex-none"
      >
        <SkipForward className="mr-2 h-5 w-5" />
        Passer
      </Button>
    </div>
  );
}
