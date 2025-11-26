"use client";

import { useState, useEffect } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ExportStats } from "@/types/export";

export default function ExportPage() {
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [format, setFormat] = useState<"jsonl" | "csv">("jsonl");
  const [onlyCorrections, setOnlyCorrections] = useState(false);
  const [minReviews, setMinReviews] = useState(1);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams({
      format,
      only_corrections: String(onlyCorrections),
      min_reviews: String(minReviews),
    });
    window.open(`/api/export?${params}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Export des donnees</h1>

      {/* Stats */}
      {stats && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-bold">{stats.totalSegments}</p>
                <p className="text-sm text-muted-foreground">Segments total</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.reviewedSegments}</p>
                <p className="text-sm text-muted-foreground">Segments revus</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
                <p className="text-sm text-muted-foreground">Reviews</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCorrections}</p>
                <p className="text-sm text-muted-foreground">Corrections</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueReviewers}</p>
                <p className="text-sm text-muted-foreground">Contributeurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export options */}
      <Card>
        <CardHeader>
          <CardTitle>Options d&apos;export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format */}
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <Button
                variant={format === "jsonl" ? "default" : "outline"}
                onClick={() => setFormat("jsonl")}
                className="flex-1"
              >
                <FileJson className="mr-2 h-4 w-4" />
                JSONL
              </Button>
              <Button
                variant={format === "csv" ? "default" : "outline"}
                onClick={() => setFormat("csv")}
                className="flex-1"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <Label htmlFor="minReviews">Minimum de reviews par segment</Label>
            <Input
              id="minReviews"
              type="number"
              min={1}
              max={10}
              value={minReviews}
              onChange={(e) => setMinReviews(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="onlyCorrections"
              checked={onlyCorrections}
              onChange={(e) => setOnlyCorrections(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="onlyCorrections">
              Exporter uniquement les corrections
            </Label>
          </div>

          {/* Export button */}
          <Button onClick={handleExport} className="w-full" size="lg">
            <Download className="mr-2 h-5 w-5" />
            Telecharger l&apos;export
          </Button>
        </CardContent>
      </Card>

      {/* Back link */}
      <p className="mt-8 text-center">
        <a href="/" className="text-primary hover:underline">
          Retour a l&apos;accueil
        </a>
      </p>
    </main>
  );
}
