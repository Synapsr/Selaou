"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  MessageSquare,
  Trash2,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Reviewer {
  id: string;
  email: string;
  reviewCount: number;
  correctionCount: number;
  createdAt: string;
  lastReviewAt: string | null;
}

interface Review {
  id: string;
  segmentId: string;
  reviewerId: string;
  isCorrect: boolean;
  correctedText: string | null;
  createdAt: string;
  reviewerEmail: string;
  segmentText: string;
  audioSourceName: string;
}

interface Feedback {
  id: string;
  segmentId: string;
  reviewerId: string;
  type: string;
  message: string | null;
  createdAt: string;
  reviewerEmail: string;
  segmentText: string;
  audioSourceName: string;
  audioSourceId: string;
}

interface Segment {
  id: string;
  audioSourceId: string;
  segmentIndex: number;
  startTime: string;
  endTime: string;
  text: string;
  confidence: string;
  reviewCount: number;
  audioSourceName: string;
  audioUrl: string;
}

type Tab = "reviewers" | "reviews" | "feedback" | "segments";
type SortOrder = "asc" | "desc";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("reviewers");

  // Data states
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, number>>({});

  // Sorting states
  const [reviewerSort, setReviewerSort] = useState<{ field: string; order: SortOrder }>({
    field: "reviewCount",
    order: "desc",
  });
  const [segmentSort, setSegmentSort] = useState<{ field: string; order: SortOrder }>({
    field: "reviewCount",
    order: "desc",
  });

  // Filter states
  const [feedbackFilter, setFeedbackFilter] = useState<string>("");

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("selaou_admin_token");
    if (storedToken) {
      setToken(storedToken);
      verifyToken(storedToken);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/reviewers?token=${tokenToVerify}&limit=1`);
      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem("selaou_admin_token", tokenToVerify);
      } else {
        setError("Token invalide");
        localStorage.removeItem("selaou_admin_token");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    verifyToken(token);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken("");
    localStorage.removeItem("selaou_admin_token");
  };

  const fetchReviewers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/reviewers?token=${token}&sort=${reviewerSort.field}&order=${reviewerSort.order}`
      );
      const data = await response.json();
      setReviewers(data.reviewers || []);
    } catch {
      setError("Erreur lors du chargement des annotateurs");
    } finally {
      setIsLoading(false);
    }
  }, [token, reviewerSort]);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/reviews?token=${token}`);
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch {
      setError("Erreur lors du chargement des annotations");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      const typeParam = feedbackFilter ? `&type=${feedbackFilter}` : "";
      const response = await fetch(`/api/admin/feedback?token=${token}${typeParam}`);
      const data = await response.json();
      setFeedback(data.feedback || []);
      setFeedbackCounts(data.typeCounts || {});
    } catch {
      setError("Erreur lors du chargement des remarques");
    } finally {
      setIsLoading(false);
    }
  }, [token, feedbackFilter]);

  const fetchSegments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/segments?token=${token}&sort=${segmentSort.field}&order=${segmentSort.order}&minReviews=1`
      );
      const data = await response.json();
      setSegments(data.segments || []);
    } catch {
      setError("Erreur lors du chargement des segments");
    } finally {
      setIsLoading(false);
    }
  }, [token, segmentSort]);

  const deleteSegment = async (segmentId: string) => {
    if (!confirm("Supprimer ce segment et toutes ses annotations ?")) return;

    try {
      const response = await fetch(`/api/admin/segments/${segmentId}?token=${token}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setSegments(segments.filter((s) => s.id !== segmentId));
        setFeedback(feedback.filter((f) => f.segmentId !== segmentId));
      } else {
        setError("Erreur lors de la suppression");
      }
    } catch {
      setError("Erreur lors de la suppression");
    }
  };

  // Fetch data when tab changes
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const SortButton = ({
    field,
    currentSort,
    onSort,
    children,
  }: {
    field: string;
    currentSort: { field: string; order: SortOrder };
    onSort: (field: string) => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 font-medium hover:text-primary"
    >
      {children}
      {currentSort.field === field &&
        (currentSort.order === "desc" ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        ))}
    </button>
  );

  const toggleSort = (
    field: string,
    currentSort: { field: string; order: SortOrder },
    setSort: React.Dispatch<React.SetStateAction<{ field: string; order: SortOrder }>>
  ) => {
    if (currentSort.field === field) {
      setSort({ field, order: currentSort.order === "desc" ? "asc" : "desc" });
    } else {
      setSort({ field, order: "desc" });
    }
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Administration</CardTitle>
            <p className="mt-2 text-muted-foreground">Accès réservé aux administrateurs</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Token d&apos;accès</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Entrez le token admin"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isLoading}
                  required
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Vérification..." : "Accéder"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Admin dashboard
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Administration Selaou</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b pb-4">
          <Button
            variant={activeTab === "reviewers" ? "default" : "outline"}
            onClick={() => setActiveTab("reviewers")}
          >
            <Users className="mr-2 h-4 w-4" />
            Annotateurs
          </Button>
          <Button
            variant={activeTab === "reviews" ? "default" : "outline"}
            onClick={() => setActiveTab("reviews")}
          >
            <FileText className="mr-2 h-4 w-4" />
            Annotations
          </Button>
          <Button
            variant={activeTab === "feedback" ? "default" : "outline"}
            onClick={() => setActiveTab("feedback")}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Alertes & Remarques
            {(feedbackCounts.audio_issue || 0) > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-white">
                {feedbackCounts.audio_issue}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === "segments" ? "default" : "outline"}
            onClick={() => setActiveTab("segments")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Segments
          </Button>
        </div>

        {/* Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {activeTab === "reviewers" && "Liste des annotateurs"}
              {activeTab === "reviews" && "Dernières annotations"}
              {activeTab === "feedback" && "Alertes et remarques"}
              {activeTab === "segments" && "Segments annotés"}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
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
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </CardHeader>
          <CardContent>
            {/* Reviewers Tab */}
            {activeTab === "reviewers" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">
                        <SortButton
                          field="reviewCount"
                          currentSort={reviewerSort}
                          onSort={(f) => toggleSort(f, reviewerSort, setReviewerSort)}
                        >
                          Annotations
                        </SortButton>
                      </th>
                      <th className="pb-3 pr-4">
                        <SortButton
                          field="correctionCount"
                          currentSort={reviewerSort}
                          onSort={(f) => toggleSort(f, reviewerSort, setReviewerSort)}
                        >
                          Corrections
                        </SortButton>
                      </th>
                      <th className="pb-3 pr-4">Taux correction</th>
                      <th className="pb-3 pr-4">
                        <SortButton
                          field="createdAt"
                          currentSort={reviewerSort}
                          onSort={(f) => toggleSort(f, reviewerSort, setReviewerSort)}
                        >
                          Inscrit le
                        </SortButton>
                      </th>
                      <th className="pb-3">
                        <SortButton
                          field="lastReviewAt"
                          currentSort={reviewerSort}
                          onSort={(f) => toggleSort(f, reviewerSort, setReviewerSort)}
                        >
                          Dernière activité
                        </SortButton>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewers.map((reviewer) => (
                      <tr key={reviewer.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-mono text-xs">{reviewer.email}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded bg-primary/10 px-2 py-1 font-medium">
                            {reviewer.reviewCount}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{reviewer.correctionCount}</td>
                        <td className="py-3 pr-4">
                          {reviewer.reviewCount > 0
                            ? `${Math.round((reviewer.correctionCount / reviewer.reviewCount) * 100)}%`
                            : "-"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDate(reviewer.createdAt)}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {formatDate(reviewer.lastReviewAt)}
                        </td>
                      </tr>
                    ))}
                    {reviewers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Aucun annotateur trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4">Annotateur</th>
                      <th className="pb-3 pr-4">Source</th>
                      <th className="pb-3 pr-4">Texte original</th>
                      <th className="pb-3 pr-4">Correction</th>
                      <th className="pb-3 pr-4">Statut</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-mono text-xs">{review.reviewerEmail}</td>
                        <td className="py-3 pr-4 max-w-[150px] truncate" title={review.audioSourceName}>
                          {review.audioSourceName}
                        </td>
                        <td className="py-3 pr-4 max-w-[200px] truncate" title={review.segmentText}>
                          {review.segmentText}
                        </td>
                        <td className="py-3 pr-4 max-w-[200px] truncate" title={review.correctedText || "-"}>
                          {review.correctedText || "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {review.isCorrect ? (
                            <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                              Validé
                            </span>
                          ) : (
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                              Corrigé
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">{formatDate(review.createdAt)}</td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Aucune annotation trouvée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === "feedback" && (
              <div>
                {/* Filters */}
                <div className="mb-4 flex gap-2">
                  <Button
                    variant={feedbackFilter === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeedbackFilter("")}
                  >
                    Tout ({(feedbackCounts.audio_issue || 0) + (feedbackCounts.remark || 0)})
                  </Button>
                  <Button
                    variant={feedbackFilter === "audio_issue" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeedbackFilter("audio_issue")}
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Problèmes audio ({feedbackCounts.audio_issue || 0})
                  </Button>
                  <Button
                    variant={feedbackFilter === "remark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeedbackFilter("remark")}
                  >
                    <MessageSquare className="mr-1 h-3 w-3" />
                    Remarques ({feedbackCounts.remark || 0})
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4">Type</th>
                        <th className="pb-3 pr-4">Signalé par</th>
                        <th className="pb-3 pr-4">Source</th>
                        <th className="pb-3 pr-4">Segment</th>
                        <th className="pb-3 pr-4">Message</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedback.map((fb) => (
                        <tr key={fb.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            {fb.type === "audio_issue" ? (
                              <span className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                                <AlertTriangle className="h-3 w-3" />
                                Audio
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                                <MessageSquare className="h-3 w-3" />
                                Remarque
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs">{fb.reviewerEmail}</td>
                          <td className="py-3 pr-4 max-w-[120px] truncate" title={fb.audioSourceName}>
                            {fb.audioSourceName}
                          </td>
                          <td className="py-3 pr-4 max-w-[150px] truncate" title={fb.segmentText}>
                            {fb.segmentText}
                          </td>
                          <td className="py-3 pr-4 max-w-[200px] truncate" title={fb.message || "-"}>
                            {fb.message || "-"}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{formatDate(fb.createdAt)}</td>
                          <td className="py-3">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteSegment(fb.segmentId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {feedback.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">
                            Aucune alerte ou remarque
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Segments Tab */}
            {activeTab === "segments" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4">Source</th>
                      <th className="pb-3 pr-4">Texte</th>
                      <th className="pb-3 pr-4">
                        <SortButton
                          field="reviewCount"
                          currentSort={segmentSort}
                          onSort={(f) => toggleSort(f, segmentSort, setSegmentSort)}
                        >
                          Annotations
                        </SortButton>
                      </th>
                      <th className="pb-3 pr-4">
                        <SortButton
                          field="confidence"
                          currentSort={segmentSort}
                          onSort={(f) => toggleSort(f, segmentSort, setSegmentSort)}
                        >
                          Confiance
                        </SortButton>
                      </th>
                      <th className="pb-3 pr-4">Durée</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((segment) => (
                      <tr key={segment.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 max-w-[150px] truncate" title={segment.audioSourceName}>
                          {segment.audioSourceName}
                        </td>
                        <td className="py-3 pr-4 max-w-[300px] truncate" title={segment.text}>
                          {segment.text}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded bg-primary/10 px-2 py-1 font-medium">
                            {segment.reviewCount}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              parseFloat(segment.confidence) >= 0.6
                                ? "bg-green-100 text-green-800"
                                : parseFloat(segment.confidence) >= 0.4
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {(parseFloat(segment.confidence) * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {(parseFloat(segment.endTime) - parseFloat(segment.startTime)).toFixed(1)}s
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const audio = new Audio(segment.audioUrl);
                                audio.currentTime = parseFloat(segment.startTime);
                                audio.play();
                                setTimeout(
                                  () => audio.pause(),
                                  (parseFloat(segment.endTime) - parseFloat(segment.startTime)) * 1000
                                );
                              }}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteSegment(segment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {segments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Aucun segment annoté
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
