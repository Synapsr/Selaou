"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  LogOut,
  Download,
  Database,
  FileJson,
  Table,
  Archive,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminTabs, type AdminTabDef } from "@/components/admin/AdminTabs";
import { StatsOverview, type AdminOverview } from "@/components/admin/StatsOverview";
import { ReviewersTable, type ReviewerRow } from "@/components/admin/ReviewersTable";
import { ReviewsList, type ReviewRow } from "@/components/admin/ReviewsList";
import { FeedbackList, type FeedbackRow } from "@/components/admin/FeedbackList";
import { SegmentsTable, type SegmentRow } from "@/components/admin/SegmentsTable";

type Tab = "reviewers" | "reviews" | "feedback" | "segments" | "export";
type ReviewerSortField = "reviewCount" | "correctionCount" | "createdAt" | "lastReviewAt";
type SegmentSortField = "reviewCount" | "confidence";
type SortOrder = "asc" | "desc";
type ExportFormat = "json" | "csv" | "jsonl";

export default function AdminPage() {
  const prefersReducedMotion = useReducedMotion();

  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("reviewers");

  // Data
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reviewers, setReviewers] = useState<ReviewerRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [feedbackCounts, setFeedbackCounts] = useState<{ audio_issue: number; remark: number }>({
    audio_issue: 0,
    remark: 0,
  });

  const [isFetching, setIsFetching] = useState(false);
  const [reviewerSort, setReviewerSort] = useState<{ field: ReviewerSortField; order: SortOrder }>({
    field: "reviewCount",
    order: "desc",
  });
  const [segmentSort, setSegmentSort] = useState<{ field: SegmentSortField; order: SortOrder }>({
    field: "reviewCount",
    order: "desc",
  });
  const [feedbackFilter, setFeedbackFilter] = useState<string>("");

  // Token bootstrap
  useEffect(() => {
    const storedToken = localStorage.getItem("selaou_admin_token");
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setAuthChecking(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    setAuthChecking(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/overview?token=${encodeURIComponent(tokenToVerify)}`
      );
      if (res.ok) {
        const data = (await res.json()) as AdminOverview;
        setOverview(data);
        setToken(tokenToVerify);
        setIsAuthenticated(true);
        localStorage.setItem("selaou_admin_token", tokenToVerify);
      } else {
        setError("Token invalide");
        localStorage.removeItem("selaou_admin_token");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    verifyToken(token);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken("");
    setOverview(null);
    localStorage.removeItem("selaou_admin_token");
  };

  const refreshOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/overview?token=${encodeURIComponent(token)}`);
      if (res.ok) setOverview(await res.json());
    } catch {
      // silent
    }
  }, [token]);

  const fetchReviewers = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch(
        `/api/admin/reviewers?token=${encodeURIComponent(token)}&sort=${reviewerSort.field}&order=${reviewerSort.order}`
      );
      const data = await res.json();
      setReviewers(data.reviewers || []);
    } catch {
      toast.error("Erreur lors du chargement des annotateurs");
    } finally {
      setIsFetching(false);
    }
  }, [token, reviewerSort]);

  const fetchReviews = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/admin/reviews?token=${encodeURIComponent(token)}&limit=200`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      toast.error("Erreur lors du chargement des annotations");
    } finally {
      setIsFetching(false);
    }
  }, [token]);

  const fetchFeedback = useCallback(async () => {
    setIsFetching(true);
    try {
      const typeParam = feedbackFilter ? `&type=${feedbackFilter}` : "";
      const res = await fetch(`/api/admin/feedback?token=${encodeURIComponent(token)}${typeParam}`);
      const data = await res.json();
      setFeedback(data.feedback || []);
      setFeedbackCounts(data.typeCounts || { audio_issue: 0, remark: 0 });
    } catch {
      toast.error("Erreur lors du chargement des remarques");
    } finally {
      setIsFetching(false);
    }
  }, [token, feedbackFilter]);

  const fetchSegments = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch(
        `/api/admin/segments?token=${encodeURIComponent(token)}&sort=${segmentSort.field}&order=${segmentSort.order}&minReviews=1`
      );
      const data = await res.json();
      setSegments(data.segments || []);
    } catch {
      toast.error("Erreur lors du chargement des segments");
    } finally {
      setIsFetching(false);
    }
  }, [token, segmentSort]);

  const deleteSegment = async (segmentId: string) => {
    if (!confirm("Supprimer ce segment et toutes ses annotations ?")) return;
    try {
      const res = await fetch(
        `/api/admin/segments/${segmentId}?token=${encodeURIComponent(token)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSegments((prev) => prev.filter((s) => s.id !== segmentId));
        setFeedback((prev) => prev.filter((f) => f.segmentId !== segmentId));
        toast.success("Segment supprimé");
        refreshOverview();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Tab data fetching
  useEffect(() => {
    if (!isAuthenticated) return;
    switch (activeTab) {
      case "reviewers":
        fetchReviewers();
        break;
      case "reviews":
        fetchReviews();
        break;
      case "feedback":
        fetchFeedback();
        break;
      case "segments":
        fetchSegments();
        break;
    }
  }, [isAuthenticated, activeTab, fetchReviewers, fetchReviews, fetchFeedback, fetchSegments]);

  const refreshActive = () => {
    refreshOverview();
    switch (activeTab) {
      case "reviewers":
        fetchReviewers();
        break;
      case "reviews":
        fetchReviews();
        break;
      case "feedback":
        fetchFeedback();
        break;
      case "segments":
        fetchSegments();
        break;
    }
  };

  const toggleReviewerSort = (field: ReviewerSortField) => {
    setReviewerSort((prev) =>
      prev.field === field
        ? { field, order: prev.order === "desc" ? "asc" : "desc" }
        : { field, order: "desc" }
    );
  };

  const toggleSegmentSort = (field: SegmentSortField) => {
    setSegmentSort((prev) =>
      prev.field === field
        ? { field, order: prev.order === "desc" ? "asc" : "desc" }
        : { field, order: "desc" }
    );
  };

  // Login
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Administration</h1>
            <p className="mt-1 text-sm text-slate-500">
              Accès réservé aux administrateurs
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="token" className="text-xs text-slate-500">
                Token d&apos;accès
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="Entrez le token admin"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={authChecking}
                className="mt-1.5"
                required
                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800"
              disabled={authChecking}
            >
              {authChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Accéder"
              )}
            </Button>
          </form>
        </motion.div>
      </main>
    );
  }

  // Tabs definition
  const tabs: AdminTabDef<Tab>[] = [
    { value: "reviewers", label: "Annotateurs", icon: Users, badge: overview?.reviewers.total },
    { value: "reviews", label: "Annotations", icon: FileText, badge: overview?.reviews.total },
    {
      value: "feedback",
      label: "Alertes",
      icon: AlertTriangle,
      badge: overview?.feedback.audioIssues,
      badgeUrgent: (overview?.feedback.audioIssues ?? 0) > 0,
    },
    { value: "segments", label: "Segments", icon: MessageSquare },
    { value: "export", label: "Export", icon: Download },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <div className="flex items-baseline gap-2">
              <h1 className="font-semibold text-slate-900">Administration</h1>
              <span className="text-xs text-slate-400">Selaou</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshActive}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium transition-colors"
              disabled={isFetching}
              title="Actualiser"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* KPIs */}
        <StatsOverview data={overview} />

        {/* Tabs */}
        <AdminTabs tabs={tabs} active={activeTab} onSelect={setActiveTab} />

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "reviewers" && (
              <ReviewersTable
                reviewers={reviewers}
                sort={reviewerSort}
                onSort={toggleReviewerSort}
              />
            )}

            {activeTab === "reviews" && <ReviewsList reviews={reviews} />}

            {activeTab === "feedback" && (
              <FeedbackList
                feedback={feedback}
                counts={feedbackCounts}
                filter={feedbackFilter}
                onFilterChange={setFeedbackFilter}
                onDeleteSegment={deleteSegment}
              />
            )}

            {activeTab === "segments" && (
              <SegmentsTable
                segments={segments}
                sort={segmentSort}
                onSort={toggleSegmentSort}
                onDelete={deleteSegment}
              />
            )}

            {activeTab === "export" && <ExportSection token={token} />}
          </motion.section>
        </AnimatePresence>
      </div>
    </main>
  );
}

// ─── Export section (kept inline — closely tied to admin page) ─────────────

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  token: string;
  formats?: ExportFormat[];
}

function ExportCard({ title, description, icon, type, token, formats = ["json", "csv"] }: ExportCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("json");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    const url = `/api/admin/export?token=${encodeURIComponent(token)}&type=${type}&format=${selectedFormat}`;
    window.open(url, "_blank");
    setTimeout(() => setIsDownloading(false), 1000);
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
        >
          {formats.includes("json") && <option value="json">JSON</option>}
          {formats.includes("csv") && <option value="csv">CSV</option>}
          {formats.includes("jsonl") && <option value="jsonl">JSONL</option>}
        </select>
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          size="sm"
          className="flex-1 bg-slate-900 hover:bg-slate-800"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {isDownloading ? "..." : "Télécharger"}
        </Button>
      </div>
    </div>
  );
}

function ExportSection({ token }: { token: string }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Exportez vos données dans différents formats selon vos besoins.
      </p>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <ExportCard
          title="Dataset IA"
          description="Format optimisé pour l'entraînement (HuggingFace)"
          icon={<Database className="h-5 w-5" />}
          type="dataset"
          token={token}
          formats={["jsonl", "json", "csv"]}
        />
        <ExportCard
          title="Annotateurs"
          description="Liste des contributeurs et leurs statistiques"
          icon={<Users className="h-5 w-5" />}
          type="reviewers"
          token={token}
        />
        <ExportCard
          title="Annotations"
          description="Toutes les corrections et validations"
          icon={<FileText className="h-5 w-5" />}
          type="reviews"
          token={token}
        />
        <ExportCard
          title="Segments"
          description="Tous les segments audio avec métadonnées"
          icon={<Table className="h-5 w-5" />}
          type="segments"
          token={token}
        />
        <ExportCard
          title="Alertes & Remarques"
          description="Feedbacks signalés par les annotateurs"
          icon={<AlertTriangle className="h-5 w-5" />}
          type="feedback"
          token={token}
        />
        <ExportCard
          title="Export complet"
          description="Toutes les données en un seul fichier"
          icon={<Archive className="h-5 w-5" />}
          type="full"
          token={token}
          formats={["json"]}
        />
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4">
        <h4 className="mb-2 font-medium text-sm flex items-center gap-2 text-slate-700">
          <FileJson className="h-4 w-4" />
          Formats disponibles
        </h4>
        <ul className="space-y-1 text-sm text-slate-500">
          <li><strong className="text-slate-700">JSON</strong> — Format structuré, idéal pour l&apos;analyse et l&apos;intégration</li>
          <li><strong className="text-slate-700">CSV</strong> — Compatible Excel/Google Sheets pour l&apos;analyse manuelle</li>
          <li><strong className="text-slate-700">JSONL</strong> — Une ligne par entrée, optimisé pour le streaming et HuggingFace</li>
        </ul>
      </div>
    </div>
  );
}
