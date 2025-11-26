"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Veuillez entrer une adresse email valide");
      return;
    }

    setIsLoading(true);

    try {
      // Store email in localStorage for session persistence
      localStorage.setItem(
        "selaou_session",
        JSON.stringify({
          email,
          startedAt: new Date().toISOString(),
        })
      );

      // Navigate to review page
      router.push("/review");
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Headphones className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Selaou</CardTitle>
          <p className="mt-2 text-muted-foreground">
            Aidez a ameliorer la transcription audio
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Votre email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Chargement..." : "Commencer"}
            </Button>
          </form>

          <div className="mt-6 border-t pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Ecoutez des extraits audio et validez ou corrigez la transcription
              automatique.
            </p>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Projet open source -{" "}
          <a
            href="https://github.com/your-repo/selaou"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
