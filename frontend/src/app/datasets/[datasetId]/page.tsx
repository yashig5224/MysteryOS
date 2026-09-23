"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { InvestigationAssistant } from "@/components/investigation/InvestigationAssistant";
import { InvestigationSource } from "@/types/investigation";
import { datasetService } from "@/services/datasetService";
import { analysisService } from "@/services/analysisService";
import { patternService } from "@/services/patternService";
import { evidenceService } from "@/services/evidenceService";
import {
  DatasetMetadata,
  DatasetProfile,
  DatasetPreview,
} from "@/types/dataset";
import { AnalysisSummary, AnalysisFinding } from "@/types/analysis";
import {
  PatternSummary,
  Pattern,
} from "@/types/patterns";
import {
  EvidenceSummary,
  Hypothesis,
  InvestigationThread,
} from "@/types/evidence";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { FindingDetailModal } from "@/components/analysis/FindingDetailModal";
import { AnomalyChart } from "@/components/analysis/AnomalyChart";
import { TrendTimeSeriesChart } from "@/components/analysis/TrendTimeSeriesChart";
import { PatternDetailModal } from "@/components/patterns/PatternDetailModal";
import { CorrelationVisualizer } from "@/components/patterns/CorrelationVisualizer";
import { TimelineView } from "@/components/patterns/TimelineView";
import { RelationshipList } from "@/components/patterns/RelationshipList";
import { EvidenceHypothesisMatrix } from "@/components/evidence/EvidenceHypothesisMatrix";
import { HypothesisDetailModal } from "@/components/evidence/HypothesisDetailModal";
import { InvestigationThreadModal } from "@/components/evidence/InvestigationThreadModal";
import { KnowledgeGraphWorkspace } from "@/components/graph/KnowledgeGraphWorkspace";

interface DatasetDetailPageProps {
  params: Promise<{ datasetId: string }>;
}

export default function DatasetDetailPage({ params }: DatasetDetailPageProps) {
  const resolvedParams = use(params);
  const datasetId = resolvedParams.datasetId;

  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis State (Phase 3)
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<AnalysisFinding | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score");

  // Pattern Discovery State (Phase 4)
  const [patterns, setPatterns] = useState<PatternSummary | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsError, setPatternsError] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [patternFilter, setPatternFilter] = useState<string>("all");
  const [patternSortBy, setPatternSortBy] = useState<string>("strength");
  const [patternSubTab, setPatternSubTab] = useState<string>("patterns");

  // Evidence & Investigation State (Phase 5)
  const [evidenceSummary, setEvidenceSummary] = useState<EvidenceSummary | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [selectedHypothesis, setSelectedHypothesis] = useState<Hypothesis | null>(null);
  const [selectedThread, setSelectedThread] = useState<InvestigationThread | null>(null);
  const [evidenceSubTab, setEvidenceSubTab] = useState<"threads" | "matrix" | "hypotheses" | "evidence" | "clusters">("threads");
  const [evidenceFilter, setEvidenceFilter] = useState<string>("all");
  const [hypothesisConfidenceFilter, setHypothesisConfidenceFilter] = useState<string>("all");

  // Preview pagination state
  const [previewPage, setPreviewPage] = useState(0);
  const pageSize = 25;
  const [previewLoading, setPreviewLoading] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState("overview");
  const [aiInvestigationQuery, setAiInvestigationQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [metaData, profileData, previewData] = await Promise.all([
          datasetService.getDataset(datasetId),
          datasetService.getDatasetProfile(datasetId),
          datasetService.getDatasetPreview(datasetId, pageSize, 0),
        ]);
        setMetadata(metaData);
        setProfile(profileData);
        setPreview(previewData);

        // Try loading cached analysis
        try {
          const cachedAnalysis = await analysisService.getAnalysis(datasetId);
          setAnalysis(cachedAnalysis);
        } catch {}

        // Try loading cached patterns
        try {
          const cachedPatterns = await patternService.getPatterns(datasetId);
          setPatterns(cachedPatterns);
        } catch {}

        // Try loading cached evidence & hypotheses
        try {
          const cachedEvidence = await evidenceService.getEvidenceSummary(datasetId);
          setEvidenceSummary(cachedEvidence);
        } catch {}
      } catch (err: any) {
        setError(err?.detail || err?.message || "Failed to load dataset details.");
      } finally {
        setLoading(false);
      }
    }

    if (datasetId) {
      loadData();
    }
  }, [datasetId]);

  const handleRunAnalysis = async (force: boolean = false) => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const summary = await analysisService.runAnalysis(datasetId, force);
      setAnalysis(summary);
      setActiveTab("analysis");
    } catch (err: any) {
      setAnalysisError(err?.detail || err?.message || "Failed to execute anomaly detection engine.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleRunPatterns = async (force: boolean = false) => {
    setPatternsLoading(true);
    setPatternsError(null);
    try {
      const summary = await patternService.runPatternAnalysis(datasetId, force);
      setPatterns(summary);
      setActiveTab("patterns");
    } catch (err: any) {
      setPatternsError(err?.detail || err?.message || "Failed to execute pattern discovery engine.");
    } finally {
      setPatternsLoading(false);
    }
  };

  const handleRunEvidence = async (force: boolean = false) => {
    setEvidenceLoading(true);
    setEvidenceError(null);
    try {
      const summary = await evidenceService.runEvidenceAnalysis(datasetId, force);
      setEvidenceSummary(summary);
      setActiveTab("evidence");
    } catch (err: any) {
      setEvidenceError(err?.detail || err?.message || "Failed to execute evidence synthesis engine.");
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage < 0) return;
    setPreviewLoading(true);
    try {
      const offset = newPage * pageSize;
      const data = await datasetService.getDatasetPreview(datasetId, pageSize, offset);
      setPreview(data);
      setPreviewPage(newPage);
    } catch (err: any) {
      console.error("Preview fetch error:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getHealthBadge = (score: number) => {
    if (score >= 90) return <Badge variant="success" size="md">HEALTH {score}/100</Badge>;
    if (score >= 75) return <Badge variant="primary" size="md">HEALTH {score}/100</Badge>;
    if (score >= 60) return <Badge variant="warning" size="md">HEALTH {score}/100</Badge>;
    return <Badge variant="danger" size="md">HEALTH {score}/100</Badge>;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "numeric":
        return <Badge variant="primary" size="sm" className="font-mono text-[10px] uppercase">NUMERIC</Badge>;
      case "categorical":
        return <Badge variant="secondary" size="sm" className="font-mono text-[10px] uppercase">CATEGORY</Badge>;
      case "datetime":
        return <Badge variant="warning" size="sm" className="font-mono text-[10px] uppercase">DATETIME</Badge>;
      case "id":
        return <Badge variant="success" size="sm" className="font-mono text-[10px] uppercase">KEY / ID</Badge>;
      case "boolean":
        return <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase">BOOLEAN</Badge>;
      default:
        return <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase">{type}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return <Badge variant="danger" size="sm">HIGH</Badge>;
      case "medium":
        return <Badge variant="warning" size="sm">MEDIUM</Badge>;
      default:
        return <Badge variant="primary" size="sm">LOW</Badge>;
    }
  };

  const getPatternTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "correlation":
        return <Badge variant="primary" size="sm">CORRELATION</Badge>;
      case "trend":
        return <Badge variant="success" size="sm">TREND</Badge>;
      case "group_difference":
        return <Badge variant="warning" size="sm">GROUP DISPARITY</Badge>;
      case "change_point":
        return <Badge variant="danger" size="sm">STRUCTURAL SHIFT</Badge>;
      case "cross_finding":
        return <Badge variant="secondary" size="sm">FINDING CLUSTER</Badge>;
      default:
        return <Badge variant="outline" size="sm">{type.toUpperCase()}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
        <PageContainer className="py-20 text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-r-transparent" />
          <p className="text-xs text-slate-600 font-mono uppercase tracking-wider">Loading dataset profile and workspace...</p>
        </PageContainer>
      </div>
    );
  }

  if (error || !metadata || !profile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
        <Header
          title="Dataset Error"
          actions={
            <Link href="/datasets">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Datasets
              </Button>
            </Link>
          }
        />
        <PageContainer className="py-12">
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Dataset Not Found or Profiling Failed</h3>
            <p className="text-xs text-red-700 mt-1 max-w-md">{error || "Could not load dataset details."}</p>
            <Link href="/datasets" className="mt-6">
              <Button size="sm">Return to Datasets</Button>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  const handleSelectSource = (source: InvestigationSource) => {
    const normId = source.id.toLowerCase().replace("-", "_");

    if (source.type === "finding" || normId.startsWith("fnd_")) {
      const fnd = (analysis?.findings || []).find(
        (f) => f.finding_id.toLowerCase().replace("-", "_") === normId
      );
      if (fnd) {
        setSelectedFinding(fnd);
      }
    } else if (source.type === "pattern" || normId.startsWith("pat_")) {
      const pat = (patterns?.patterns || []).find(
        (p) => p.pattern_id.toLowerCase().replace("-", "_") === normId
      );
      if (pat) {
        setSelectedPattern(pat);
      }
    } else if (source.type === "hypothesis" || normId.startsWith("hyp_")) {
      const hyp = (evidenceSummary?.hypotheses || []).find(
        (h) => h.hypothesis_id.toLowerCase().replace("-", "_") === normId
      );
      if (hyp) {
        setSelectedHypothesis(hyp);
      }
    } else if (source.type === "thread" || normId.startsWith("thr_") || normId.startsWith("thread_")) {
      const thr = (evidenceSummary?.threads || []).find(
        (t) => t.thread_id.toLowerCase().replace("-", "_") === normId
      );
      if (thr) {
        setSelectedThread(thr);
      }
    } else if (source.type === "evidence" || normId.startsWith("evd_") || normId.startsWith("evi_")) {
      const evd = (evidenceSummary?.evidence || []).find(
        (e) => e.evidence_id.toLowerCase().replace("-", "_") === normId
      );
      if (evd) {
        const patIds = evd.supports_pattern_ids || [];
        const fndIds = evd.related_finding_ids || [];
        if (patIds.length > 0) {
          const pat = (patterns?.patterns || []).find(
            (p) => p.pattern_id === patIds[0]
          );
          if (pat) setSelectedPattern(pat);
        } else if (fndIds.length > 0) {
          const fnd = (analysis?.findings || []).find(
            (f) => f.finding_id === fndIds[0]
          );
          if (fnd) setSelectedFinding(fnd);
        }
      }
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "graph", label: "Knowledge Graph" },
    { id: "investigation", label: "AI Investigation" },
    { id: "evidence", label: "Evidence & Hypotheses", count: evidenceSummary?.total_hypotheses },
    { id: "analysis", label: "Analysis", count: analysis?.total_findings },
    { id: "patterns", label: "Patterns & Timeline", count: patterns?.total_patterns },
    { id: "preview", label: "Preview" },
    { id: "columns", label: "Columns", count: profile.column_count },
    { id: "quality", label: "Data Quality" },
    { id: "statistics", label: "Statistics" },
  ];

  // Filtered & Sorted Findings (Phase 3)
  const filteredFindings = (analysis?.findings || []).filter((f) => {
    if (severityFilter !== "all" && f.severity.toLowerCase() !== severityFilter.toLowerCase()) {
      return false;
    }
    if (typeFilter !== "all") {
      if (typeFilter === "anomaly" && f.type !== "anomaly") return false;
      if (typeFilter === "trend" && f.type !== "trend") return false;
      if (typeFilter === "statistical" && f.type !== "statistical") return false;
    }
    return true;
  });

  filteredFindings.sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "column") return (a.column || "").localeCompare(b.column || "");
    return 0;
  });

  // Filtered & Sorted Patterns (Phase 4)
  const filteredPatterns = (patterns?.patterns || []).filter((p) => {
    if (patternFilter !== "all" && p.type.toLowerCase() !== patternFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  filteredPatterns.sort((a, b) => {
    if (patternSortBy === "strength") return b.strength - a.strength;
    if (patternSortBy === "significance") return a.significance.localeCompare(b.significance);
    return 0;
  });

  // Filtered Evidence (Phase 5)
  const filteredEvidence = (evidenceSummary?.evidence || []).filter((e) => {
    if (evidenceFilter !== "all") {
      if (evidenceFilter === "strong" && e.strength < 80) return false;
      if (evidenceFilter === "moderate" && (e.strength < 50 || e.strength >= 80)) return false;
      if (evidenceFilter === "contradict" && e.polarity !== "contradict") return false;
      if (evidenceFilter === "support" && e.polarity !== "support") return false;
    }
    return true;
  });

  // Filtered Hypotheses (Phase 5)
  const filteredHypotheses = (evidenceSummary?.hypotheses || []).filter((h) => {
    if (hypothesisConfidenceFilter !== "all") {
      if (hypothesisConfidenceFilter === "high" && h.confidence < 80) return false;
      if (hypothesisConfidenceFilter === "moderate" && (h.confidence < 50 || h.confidence >= 80)) return false;
      if (hypothesisConfidenceFilter === "disputed" && h.contradicting_evidence_ids.length === 0) return false;
    }
    return true;
  });

  // Unique columns with anomalies for charts
  const columnsWithOutliers = Array.from(
    new Set(
      (analysis?.findings || [])
        .filter((f) => f.type === "anomaly" && f.column && typeof f.observed_value === "number")
        .map((f) => f.column as string)
    )
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
      <Header
        title={metadata.name}
        subtitle={`${metadata.filename} • ${formatFileSize(metadata.size_bytes)}`}
        badge={getHealthBadge(profile.quality.overall_score)}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant={evidenceSummary ? "outline" : "primary"}
              size="sm"
              onClick={() => handleRunEvidence(Boolean(evidenceSummary))}
              disabled={evidenceLoading}
            >
              {evidenceLoading
                ? "Synthesizing Evidence..."
                : evidenceSummary
                ? "Re-synthesize Evidence"
                : "Synthesize Evidence"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRunPatterns(Boolean(patterns))}
              disabled={patternsLoading}
            >
              {patternsLoading
                ? "Discovering Patterns..."
                : patterns
                ? "Re-run Patterns"
                : "Discover Patterns"}
            </Button>
            <Link href="/datasets">
              <Button variant="outline" size="sm">
                <span>All Datasets</span>
              </Button>
            </Link>
          </div>
        }
      />

      <PageContainer className="py-6 space-y-6">
        {/* Main Tabs Navigation */}
        <div className="border-b border-slate-200">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* TAB: KNOWLEDGE GRAPH (PHASE 7) */}
        {activeTab === "graph" && (
          <KnowledgeGraphWorkspace
            datasetId={datasetId}
            evidenceSummary={evidenceSummary}
            onInvestigateWithAI={(query, threadId) => {
              setAiInvestigationQuery(query);
              setActiveTab("investigation");
            }}
            onSelectFindingModal={(findingId) => {
              const normId = findingId.toLowerCase().replace("-", "_");
              const fnd = (analysis?.findings || []).find(
                (f) => f.finding_id.toLowerCase().replace("-", "_") === normId
              );
              if (fnd) setSelectedFinding(fnd);
            }}
            onSelectPatternModal={(patternId) => {
              const normId = patternId.toLowerCase().replace("-", "_");
              const pat = (patterns?.patterns || []).find(
                (p) => p.pattern_id.toLowerCase().replace("-", "_") === normId
              );
              if (pat) setSelectedPattern(pat);
            }}
            onSelectHypothesisModal={(hyp) => setSelectedHypothesis(hyp)}
            onSelectThreadModal={(thr) => setSelectedThread(thr)}
          />
        )}

        {/* TAB: AI INVESTIGATION ASSISTANT (PHASE 6) */}
        {activeTab === "investigation" && (
          <InvestigationAssistant
            datasetId={datasetId}
            evidenceSummary={evidenceSummary}
            initialQuestion={aiInvestigationQuery}
            onSelectSource={handleSelectSource}
            onSelectHypothesis={(h) => setSelectedHypothesis(h)}
            onSelectThreadModal={(t) => setSelectedThread(t)}
          />
        )}

        {/* TAB: EVIDENCE & HYPOTHESES (PHASE 5) */}
        {activeTab === "evidence" && (
          <div className="space-y-6">
            {!evidenceSummary && !evidenceLoading && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-mono text-xs font-bold">
                  EVD
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-slate-900">Evidence Synthesis &amp; Hypothesis Engine</h3>
                  <p className="text-xs text-slate-600">
                    Transform lower-level findings, correlations, and temporal patterns into structured empirical evidence, detect contradictions, and synthesize prioritized investigation threads with candidate hypotheses.
                  </p>
                </div>
                <Button onClick={() => handleRunEvidence(false)} size="md">
                  Synthesize Evidence &amp; Candidate Hypotheses
                </Button>
              </div>
            )}

            {evidenceLoading && (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-r-transparent" />
                <p className="text-sm font-semibold text-slate-900">Synthesizing Evidence &amp; Formulating Hypotheses...</p>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Weighting empirical signals, checking segmental invariants for contradictions, clustering feature evidence, and assembling ranked investigation threads.
                </p>
              </div>
            )}

            {evidenceError && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900">
                <span>{evidenceError}</span>
                <Button variant="outline" size="sm" onClick={() => handleRunEvidence(true)}>
                  Retry
                </Button>
              </div>
            )}

            {evidenceSummary && (
              <div className="space-y-6">
                {/* Summary KPI Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-1">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Total Empirical Evidence</span>
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      {evidenceSummary.total_evidence}
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      {evidenceSummary.strong_evidence} Strong &bull; {evidenceSummary.moderate_evidence} Moderate
                    </div>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-1">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Strong Evidence</span>
                    <div className="text-2xl font-bold text-teal-800 font-mono">
                      {evidenceSummary.strong_evidence}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Score &ge; 80 (Cross-corroborated)
                    </div>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-1">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Candidate Hypotheses</span>
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      {evidenceSummary.total_hypotheses}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Deterministic empirical formulations
                    </div>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-1">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Investigation Threads</span>
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      {evidenceSummary.total_investigation_threads}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Ranked by priority &amp; corroboration
                    </div>
                  </Card>
                </div>

                {/* Sub-Tabs Selector */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={evidenceSubTab === "threads" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setEvidenceSubTab("threads")}
                    >
                      Investigation Threads ({evidenceSummary.threads.length})
                    </Button>
                    <Button
                      variant={evidenceSubTab === "matrix" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setEvidenceSubTab("matrix")}
                    >
                      Visual Corroboration Matrix
                    </Button>
                    <Button
                      variant={evidenceSubTab === "hypotheses" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setEvidenceSubTab("hypotheses")}
                    >
                      Candidate Hypotheses ({evidenceSummary.hypotheses.length})
                    </Button>
                    <Button
                      variant={evidenceSubTab === "evidence" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setEvidenceSubTab("evidence")}
                    >
                      Empirical Evidence ({evidenceSummary.evidence.length})
                    </Button>
                    <Button
                      variant={evidenceSubTab === "clusters" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setEvidenceSubTab("clusters")}
                    >
                      Evidence Clusters ({evidenceSummary.clusters.length})
                    </Button>
                  </div>

                  <span className="text-[11px] text-slate-600 font-mono">
                    Synthesized in {evidenceSummary.duration_ms ?? 0}ms
                  </span>
                </div>

                {/* SUB-TAB: VISUAL CORROBORATION MATRIX */}
                {evidenceSubTab === "matrix" && (
                  <EvidenceHypothesisMatrix
                    evidence={evidenceSummary.evidence}
                    hypotheses={evidenceSummary.hypotheses}
                    onSelectHypothesis={(hyp) => setSelectedHypothesis(hyp)}
                  />
                )}

                {/* SUB-TAB 1: INVESTIGATION THREADS */}
                {evidenceSubTab === "threads" && (
                  <div className="space-y-4">
                    {evidenceSummary.threads.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {evidenceSummary.threads.map((thread) => (
                          <Card
                            key={thread.thread_id}
                            className="p-5 bg-white border-slate-200 hover:border-teal-600 shadow-sm transition-all space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant={thread.priority >= 80 ? "danger" : thread.priority >= 60 ? "warning" : "primary"}
                                    size="sm"
                                  >
                                    PRIORITY {thread.priority}
                                  </Badge>
                                  <span className="text-[11px] text-slate-600 font-mono uppercase">
                                    STATUS: {thread.status}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold text-slate-900">{thread.title}</h4>
                              </div>

                              <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                                {thread.summary}
                              </p>

                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {thread.primary_columns && thread.primary_columns.length > 0 ? (
                                  thread.primary_columns.map((col, idx) => (
                                    <span
                                      key={idx}
                                      className="font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                    >
                                      {col}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-600 italic">Cross-feature synthesis</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-slate-600 font-mono text-[11px]">
                                {thread.hypothesis_ids.length} Hypotheses &bull; {thread.evidence_ids.length} Evidence Items
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedThread(thread)}
                              >
                                Inspect Thread &rarr;
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-600">
                        No distinct multi-signal investigation threads synthesized for this dataset.
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 2: CANDIDATE HYPOTHESES */}
                {evidenceSubTab === "hypotheses" && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-slate-600">Filter Confidence:</span>
                      <select
                        value={hypothesisConfidenceFilter}
                        onChange={(e) => setHypothesisConfidenceFilter(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                      >
                        <option value="all">All Confidence Tiers</option>
                        <option value="high">High Corroboration (&ge; 80%)</option>
                        <option value="moderate">Moderate Support (50% - 79%)</option>
                        <option value="disputed">With Contradictions</option>
                      </select>
                    </div>

                    {filteredHypotheses.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {filteredHypotheses.map((hyp) => (
                          <Card
                            key={hyp.hypothesis_id}
                            className="p-5 bg-white border-slate-200 hover:border-teal-600 shadow-sm transition-all space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant={hyp.confidence >= 80 ? "success" : hyp.confidence >= 50 ? "warning" : "danger"}
                                    size="sm"
                                  >
                                    {hyp.confidence}% CONFIDENCE
                                  </Badge>
                                  {hyp.contradicting_evidence_ids.length > 0 && (
                                    <Badge variant="warning" size="sm">
                                      {hyp.contradicting_evidence_ids.length} Contradictions
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 mt-1">{hyp.title}</h4>
                              </div>

                              <div className="rounded border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700 leading-relaxed font-mono">
                                {hyp.statement}
                              </div>

                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {hyp.primary_columns && hyp.primary_columns.length > 0 ? (
                                  hyp.primary_columns.map((col, idx) => (
                                    <span
                                      key={idx}
                                      className="font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                    >
                                      {col}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-600 italic">System-level formulation</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-slate-600 font-mono text-[11px]">
                                {hyp.supporting_evidence_ids.length} Supporting &bull; Base Strength: {hyp.evidence_strength}/100
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedHypothesis(hyp)}
                              >
                                Inspect Hypothesis &rarr;
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-600">
                        No candidate hypotheses match the selected confidence filter.
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 3: EMPIRICAL EVIDENCE */}
                {evidenceSubTab === "evidence" && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-slate-600">Filter Evidence:</span>
                      <select
                        value={evidenceFilter}
                        onChange={(e) => setEvidenceFilter(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                      >
                        <option value="all">All Evidence ({evidenceSummary.evidence.length})</option>
                        <option value="strong">Strong Corroboration (&ge; 80)</option>
                        <option value="moderate">Moderate Support (50 - 79)</option>
                        <option value="support">Supporting Evidence</option>
                        <option value="contradict">Contradictory Signals</option>
                      </select>
                    </div>

                    {filteredEvidence.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredEvidence.map((evi) => (
                          <Card
                            key={evi.evidence_id}
                            className={`p-4 bg-white border-slate-200 shadow-sm transition-all space-y-3 flex flex-col justify-between ${
                              evi.polarity === "contradict" ? "border-amber-300 bg-amber-50/20" : ""
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant={evi.polarity === "contradict" ? "warning" : "success"}
                                  size="sm"
                                >
                                  {evi.polarity === "contradict" ? "CONTRADICTION" : "SUPPORTING"}
                                </Badge>
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {evi.strength}/100
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{evi.title}</h4>
                              <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                                {evi.description}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                              <span className="uppercase">{evi.evidence_type}</span>
                              <span className="truncate max-w-[120px]">
                                {evi.columns.join(", ") || "Dataset-wide"}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-600">
                        No empirical evidence items match the selected filter.
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 4: EVIDENCE CLUSTERS */}
                {evidenceSubTab === "clusters" && (
                  <div className="space-y-4">
                    {evidenceSummary.clusters.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {evidenceSummary.clusters.map((clst) => (
                          <Card
                            key={clst.cluster_id}
                            className="p-5 bg-white border-slate-200 shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900">{clst.title}</span>
                              <Badge variant="primary" size="sm">
                                Avg Strength: {clst.strength}/100
                              </Badge>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed">
                              {clst.summary}
                            </p>

                            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-mono">
                              <div className="rounded border border-slate-200 bg-slate-50 p-2">
                                <span className="text-sm font-bold text-slate-900 block">
                                  {clst.evidence_ids.length}
                                </span>
                                <span className="text-[10px] text-slate-600 uppercase">Evidence</span>
                              </div>
                              <div className="rounded border border-slate-200 bg-slate-50 p-2">
                                <span className="text-sm font-bold text-slate-900 block">
                                  {clst.pattern_ids.length}
                                </span>
                                <span className="text-[10px] text-slate-600 uppercase">Patterns</span>
                              </div>
                              <div className="rounded border border-slate-200 bg-slate-50 p-2">
                                <span className="text-sm font-bold text-slate-900 block">
                                  {clst.finding_ids.length}
                                </span>
                                <span className="text-[10px] text-slate-600 uppercase">Anomalies</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-600">
                        No multi-item evidence clusters discovered yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: PATTERNS & TIMELINE (PHASE 4) */}
        {activeTab === "patterns" && (
          <div className="space-y-6">
            {!patterns && !patternsLoading && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-mono text-xs font-bold">
                  PAT
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-slate-900">Pattern Discovery &amp; Relationship Engine</h3>
                  <p className="text-xs text-slate-600">
                    Surface inter-variable correlations, segment disparities, sustained trajectories, structural change points, and synthesize a chronological investigation timeline.
                  </p>
                </div>
                <Button onClick={() => handleRunPatterns(false)} size="md">
                  Execute Pattern Discovery Engine
                </Button>
              </div>
            )}

            {patternsLoading && (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-r-transparent" />
                <p className="text-sm font-semibold text-slate-900">Discovering Cross-Variable Patterns &amp; Timelines...</p>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Computing Pearson/Spearman coefficients, trend regressions, segmental variances, structural change points, and assembling chronological event sequences.
                </p>
              </div>
            )}

            {patternsError && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900">
                <span>{patternsError}</span>
                <Button variant="outline" size="sm" onClick={() => handleRunPatterns(true)}>
                  Retry
                </Button>
              </div>
            )}

            {patterns && (
              <div className="space-y-6">
                {/* Summary KPI Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Card className="p-4 bg-white border-slate-200 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Total Patterns</span>
                    <p className="mt-1 text-2xl font-bold text-slate-900 font-mono">{patterns.total_patterns}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">High-level systemic findings</p>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Relationships</span>
                    <p className="mt-1 text-2xl font-bold text-slate-900 font-mono">{patterns.total_relationships}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Inter-variable linkages</p>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Correlations</span>
                    <p className="mt-1 text-2xl font-bold text-slate-900 font-mono">{patterns.correlations.length}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">|r| &ge; 0.45 associations</p>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Timeline Milestones</span>
                    <p className="mt-1 text-2xl font-bold text-slate-900 font-mono">{patterns.total_timeline_events}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Chronological event chain</p>
                  </Card>
                </div>

                {/* Sub-Tabs Selector */}
                <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                  {[
                    { id: "patterns", label: `Discovered Patterns (${patterns.patterns.length})` },
                    { id: "correlations", label: `Correlation Pairs (${patterns.correlations.length})` },
                    { id: "relationships", label: `Relationship Network (${patterns.relationships.length})` },
                    { id: "timeline", label: `Investigation Timeline (${patterns.timeline.length})` },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setPatternSubTab(sub.id)}
                      className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                        patternSubTab === sub.id
                          ? "bg-teal-800 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* SUB-VIEW 1: PATTERNS LIST */}
                {patternSubTab === "patterns" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-slate-600 font-medium mr-1">Pattern Type:</span>
                        {[
                          { id: "all", label: "All" },
                          { id: "correlation", label: "Correlation" },
                          { id: "trend", label: "Trend" },
                          { id: "group_difference", label: "Segment Disparity" },
                          { id: "change_point", label: "Structural Change" },
                          { id: "cross_finding", label: "Cluster" },
                        ].map((pf) => (
                          <button
                            key={pf.id}
                            onClick={() => setPatternFilter(pf.id)}
                            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                              patternFilter === pf.id
                                ? "bg-teal-800 text-white font-semibold"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {pf.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-600">Sort:</span>
                        <select
                          value={patternSortBy}
                          onChange={(e) => setPatternSortBy(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                        >
                          <option value="strength">Pattern Strength</option>
                          <option value="significance">Significance Tier</option>
                        </select>
                      </div>
                    </div>

                    {filteredPatterns.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-600">
                        No patterns match the selected filter criteria.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {filteredPatterns.map((pat) => (
                          <div
                            key={pat.pattern_id}
                            onClick={() => setSelectedPattern(pat)}
                            className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-teal-600 hover:shadow-sm cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center space-x-2">
                                  {getPatternTypeBadge(pat.type)}
                                  <Badge variant="outline" size="sm">
                                    Strength: {pat.strength}/100
                                  </Badge>
                                  <span className="text-xs font-mono text-slate-600">
                                    Tier: {pat.significance.toUpperCase()}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-teal-800 transition-colors">
                                  {pat.title}
                                </h4>
                                <p className="text-xs text-slate-700 line-clamp-2">
                                  {pat.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  <span className="text-[10px] text-slate-600 font-mono uppercase">Involved:</span>
                                  {pat.columns.map((col, idx) => (
                                    <span key={idx} className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {col}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-col items-end shrink-0 space-y-2">
                                {pat.supporting_finding_ids && pat.supporting_finding_ids.length > 0 && (
                                  <Badge variant="outline" size="sm">
                                    {pat.supporting_finding_ids.length} supporting finding(s)
                                  </Badge>
                                )}
                                <span className="text-[11px] text-teal-800 font-semibold inline-flex items-center space-x-1">
                                  <span>Inspect Pattern &rarr;</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-VIEW 2: CORRELATIONS */}
                {patternSubTab === "correlations" && (
                  <CorrelationVisualizer correlations={patterns.correlations} />
                )}

                {/* SUB-VIEW 3: RELATIONSHIPS */}
                {patternSubTab === "relationships" && (
                  <RelationshipList relationships={patterns.relationships} />
                )}

                {/* SUB-VIEW 4: TIMELINE */}
                {patternSubTab === "timeline" && (
                  <TimelineView timeline={patterns.timeline} />
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: ANALYSIS (PHASE 3) */}
        {activeTab === "analysis" && (
          <div className="space-y-6">
            {!analysis && !analysisLoading && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-mono text-xs font-bold">
                  FND
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-slate-900">Automated Anomaly &amp; Pattern Discovery</h3>
                  <p className="text-xs text-slate-600">
                    Run the MysteryOS multi-method analysis engine (IQR, Z-Score, Isolation Forest, Categorical &amp; Temporal Differencing) to discover outliers and data-driven insights.
                  </p>
                </div>
                <Button onClick={() => handleRunAnalysis(false)} size="md">
                  Execute Analysis Engine
                </Button>
              </div>
            )}

            {analysisLoading && (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-r-transparent" />
                <p className="text-sm font-semibold text-slate-900">Running Data Mining &amp; Anomaly Detection...</p>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Computing IQR bounds, Z-scores, Isolation Forest decision spaces, class frequencies, and temporal deltas.
                </p>
              </div>
            )}

            {analysisError && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900">
                <span>{analysisError}</span>
                <Button variant="outline" size="sm" onClick={() => handleRunAnalysis(true)}>
                  Retry
                </Button>
              </div>
            )}

            {analysis && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Card className="p-4 bg-white border-slate-200 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Total Findings</span>
                    <p className="mt-1 text-2xl font-bold text-slate-900 font-mono">{analysis.total_findings}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Deduplicated anomalies</p>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">High Severity</span>
                    <p className="mt-1 text-2xl font-bold text-red-700 font-mono">{analysis.high_count}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Anomaly Score &ge; 80</p>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Medium Severity</span>
                    <p className="mt-1 text-2xl font-bold text-amber-700 font-mono">{analysis.medium_count}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Anomaly Score 50–79</p>
                  </Card>

                  <Card className="p-4 bg-white border-slate-200 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block">Low / Informational</span>
                    <p className="mt-1 text-2xl font-bold text-teal-800 font-mono">{analysis.low_count}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Anomaly Score &lt; 50</p>
                  </Card>
                </div>

                {columnsWithOutliers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-mono">
                        Numerical Outlier Distributions
                      </h3>
                      <span className="text-[11px] text-slate-600 font-mono">
                        Teal band = Normal bounds &bull; Red dots = Outliers
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {columnsWithOutliers.slice(0, 4).map((col) => {
                        const colProf = profile.columns.find((c) => c.name === col);
                        return (
                          <AnomalyChart
                            key={col}
                            columnName={col}
                            columnProfile={colProf}
                            findings={analysis.findings}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium mr-1">Severity:</span>
                    {["all", "high", "medium", "low"].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          severityFilter === sev
                            ? "bg-teal-800 text-white font-semibold"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {sev.toUpperCase()}
                      </button>
                    ))}

                    <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

                    <span className="text-xs text-slate-600 font-medium mr-1">Type:</span>
                    {[
                      { id: "all", label: "All" },
                      { id: "anomaly", label: "Anomalies" },
                      { id: "trend", label: "Trends" },
                      { id: "statistical", label: "Statistical" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTypeFilter(t.id)}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          typeFilter === t.id
                            ? "bg-teal-800 text-white font-semibold"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-600">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      <option value="score">Highest Score</option>
                      <option value="column">Column Name</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Discovered Findings ({filteredFindings.length})
                    </h3>
                    <span className="text-xs text-slate-600">
                      Click any finding card for source traceability
                    </span>
                  </div>

                  {filteredFindings.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-600">
                      No findings match the selected filter criteria.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredFindings.map((finding) => (
                        <div
                          key={finding.finding_id}
                          onClick={() => setSelectedFinding(finding)}
                          className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-teal-600 hover:shadow-sm cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                {getSeverityBadge(finding.severity)}
                                <Badge variant="outline" size="sm">
                                  Score: {finding.score}
                                </Badge>
                                {finding.column && (
                                  <span className="font-mono text-xs text-slate-900 font-semibold">
                                    {finding.column}
                                  </span>
                                )}
                                {finding.row_reference !== null && finding.row_reference !== undefined && (
                                  <span className="text-[11px] font-mono text-slate-600">
                                    (Row #{finding.row_reference})
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900 group-hover:text-teal-800 transition-colors">
                                {finding.title}
                              </h4>
                              <p className="text-xs text-slate-700 line-clamp-2">
                                {finding.description}
                              </p>
                            </div>

                            <div className="flex flex-col items-end shrink-0 space-y-1.5">
                              <div className="flex items-center space-x-1">
                                {finding.detected_by.map((m, idx) => (
                                  <Badge key={idx} variant="outline" size="sm" className="text-[10px]">
                                    {m}
                                  </Badge>
                                ))}
                              </div>
                              <span className="text-[11px] text-teal-800 font-semibold inline-flex items-center space-x-1">
                                <span>Inspect Details &rarr;</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Card className="p-5 bg-white border-slate-200 shadow-sm space-y-1">
                <p className="text-xs font-mono text-slate-600 uppercase tracking-wider font-semibold">Total Records</p>
                <p className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{profile.row_count.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-mono">Rows indexed</p>
              </Card>

              <Card className="p-5 bg-white border-slate-200 shadow-sm space-y-1">
                <p className="text-xs font-mono text-slate-600 uppercase tracking-wider font-semibold">Total Columns</p>
                <p className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{profile.column_count}</p>
                <p className="text-xs text-slate-500 font-mono">Features detected</p>
              </Card>

              <Card className="p-5 bg-white border-slate-200 shadow-sm space-y-1">
                <p className="text-xs font-mono text-slate-600 uppercase tracking-wider font-semibold">Health Score</p>
                <p className="text-3xl font-extrabold text-teal-800 font-mono tracking-tight">{profile.quality.overall_score}%</p>
                <p className="text-xs text-slate-500 font-mono">Grade {profile.quality.grade}</p>
              </Card>

              <Card className="p-5 bg-white border-slate-200 shadow-sm space-y-1">
                <p className="text-xs font-mono text-slate-600 uppercase tracking-wider font-semibold">Duplicate Rows</p>
                <p className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{profile.duplicate_rows}</p>
                <p className="text-xs text-slate-500 font-mono">{profile.duplicate_percentage}% duplicates</p>
              </Card>

              <Card className="p-5 bg-white border-slate-200 shadow-sm space-y-1">
                <p className="text-xs font-mono text-slate-600 uppercase tracking-wider font-semibold">Missing Ratio</p>
                <p className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{profile.quality.missing_percentage}%</p>
                <p className="text-xs text-slate-500 font-mono">Global cell nulls</p>
              </Card>

              <Card className="p-5 bg-white border-slate-200 shadow-sm space-y-1">
                <p className="text-xs font-mono text-slate-600 uppercase tracking-wider font-semibold">Format</p>
                <p className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{metadata.file_type.toUpperCase()}</p>
                <p className="text-xs text-slate-500 font-mono">{formatFileSize(metadata.size_bytes)}</p>
              </Card>
            </div>

            {/* Visual Anomaly Outlier Distribution Preview on Overview */}
            {columnsWithOutliers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 font-mono uppercase tracking-tight">
                  Primary Anomaly Outlier Distribution
                </h3>
                <AnomalyChart
                  columnName={columnsWithOutliers[0]}
                  columnProfile={profile.columns.find((c) => c.name === columnsWithOutliers[0])}
                  findings={analysis?.findings || []}
                />
              </div>
            )}

            {/* Visual Time Series Sequence Chart if timeline exists */}
            {patterns && patterns.timeline && patterns.timeline.length > 0 && (
              <TrendTimeSeriesChart
                title="Investigation Temporal Sequence & Milestone Graph"
                timelineEvents={patterns.timeline}
              />
            )}


            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-6 p-6 bg-white border-slate-200 shadow-sm">
                <CardHeader className="px-0 pt-0 pb-4">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Inferred Semantic Roles
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Identifier / Primary Keys:</span>
                      <span className="font-semibold text-slate-900">
                        {profile.likely_id_columns.length > 0 ? profile.likely_id_columns.join(", ") : "None detected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Temporal Series (Dates):</span>
                      <span className="font-semibold text-slate-900">
                        {profile.temporal_columns.length > 0 ? profile.temporal_columns.join(", ") : "None detected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Numerical Metrics:</span>
                      <span className="font-semibold text-slate-900">{profile.numeric_columns.length} columns</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Categorical Dimensions:</span>
                      <span className="font-semibold text-slate-900">{profile.categorical_columns.length} columns</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-6 p-6 bg-white border-slate-200 shadow-sm">
                <CardHeader className="px-0 pt-0 pb-4">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Investigative Quality Observations
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-2.5">
                  {profile.quality.observations.map((obs, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                      <span className="font-mono text-teal-700 font-bold">&bull;</span>
                      <span>{obs}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIEW */}
        {activeTab === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Showing rows <span className="font-semibold text-slate-900">{previewPage * pageSize + 1}</span> to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min((previewPage + 1) * pageSize, profile.row_count)}
                </span>{" "}
                of <span className="font-semibold text-slate-900">{profile.row_count.toLocaleString()}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(previewPage - 1)}
                  disabled={previewPage === 0 || previewLoading}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono text-slate-600">
                  Page {previewPage + 1} of {Math.ceil(profile.row_count / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(previewPage + 1)}
                  disabled={(previewPage + 1) * pageSize >= profile.row_count || previewLoading}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-12 text-center text-xs font-mono text-slate-600">#</TableHead>
                    {profile.columns.map((col) => (
                      <TableHead key={col.name} className="text-xs text-slate-900 min-w-[140px]">
                        <div className="flex flex-col space-y-1">
                          <span className="font-semibold truncate">{col.name}</span>
                          <div>{getTypeBadge(col.inferred_type)}</div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview?.rows.map((row, rIdx) => (
                    <TableRow key={rIdx} className="border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="text-center text-xs font-mono text-slate-600">
                        {previewPage * pageSize + rIdx + 1}
                      </TableCell>
                      {profile.columns.map((col) => {
                        const val = row[col.name];
                        const isNull = val === null || val === undefined || val === "";
                        return (
                          <TableCell key={col.name} className="text-xs text-slate-700 font-mono truncate max-w-[200px]">
                            {isNull ? (
                              <span className="text-slate-600 italic font-mono text-[11px]">null</span>
                            ) : typeof val === "boolean" ? (
                              <span className={val ? "text-teal-700 font-bold" : "text-red-700 font-bold"}>
                                {val.toString()}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 3: COLUMNS */}
        {activeTab === "columns" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs text-slate-900 font-semibold">Column Name</TableHead>
                    <TableHead className="text-xs text-slate-900 font-semibold">Inferred Role</TableHead>
                    <TableHead className="text-xs text-slate-900 font-semibold">DType</TableHead>
                    <TableHead className="text-xs text-slate-900 font-semibold">Nulls / Missing</TableHead>
                    <TableHead className="text-xs text-slate-900 font-semibold">Unique Values</TableHead>
                    <TableHead className="text-xs text-slate-900 font-semibold">Key Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.columns.map((col) => (
                    <TableRow key={col.name} className="border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="font-semibold text-slate-900 text-xs">{col.name}</TableCell>
                      <TableCell>{getTypeBadge(col.inferred_type)}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{col.dtype}</TableCell>
                      <TableCell className="text-xs">
                        <div className="space-y-1 max-w-[120px]">
                          <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                            <span>{col.null_count}</span>
                            <span>{col.null_percentage}%</span>
                          </div>
                          <Progress
                            value={col.null_percentage}
                            variant={col.null_percentage > 10 ? "danger" : "primary"}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-mono">
                        {col.unique_count.toLocaleString()} ({col.unique_percentage}%)
                      </TableCell>
                      <TableCell className="text-xs">
                        {col.is_likely_id && <Badge variant="success" size="sm">PRIMARY ID</Badge>}
                        {col.is_temporal && <Badge variant="outline" size="sm">TEMPORAL</Badge>}
                        {col.is_constant && <Badge variant="danger" size="sm">CONSTANT</Badge>}
                        {!col.is_likely_id && !col.is_temporal && !col.is_constant && (
                          <span className="text-slate-600 text-xs font-mono uppercase">Standard</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 4: DATA QUALITY */}
        {activeTab === "quality" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-4 flex flex-col items-center justify-center p-8 text-center bg-white border-slate-200 shadow-sm">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-teal-600 bg-teal-50 text-2xl font-bold text-teal-800 mb-3 font-mono">
                  {profile.quality.overall_score}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Health Grade {profile.quality.grade}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Overall tabular data readiness &amp; consistency index.
                </p>
              </Card>

              <Card className="lg:col-span-8 p-6 bg-white border-slate-200 shadow-sm space-y-4">
                <CardTitle className="text-sm font-semibold text-slate-900">Quality Dimensions</CardTitle>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">Completeness (Non-Missing)</span>
                      <span className="font-semibold text-slate-900 font-mono">{profile.quality.completeness_score}%</span>
                    </div>
                    <Progress value={profile.quality.completeness_score} variant="success" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">Uniqueness (Non-Duplicate Records)</span>
                      <span className="font-semibold text-slate-900 font-mono">{profile.quality.uniqueness_score}%</span>
                    </div>
                    <Progress value={profile.quality.uniqueness_score} variant="primary" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">Consistency Ratio</span>
                      <span className="font-semibold text-slate-900 font-mono">{profile.quality.consistency_percentage}%</span>
                    </div>
                    <Progress value={profile.quality.consistency_percentage} variant="primary" />
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-white border-slate-200 shadow-sm">
              <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Automated Detective Observations
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-2.5">
                {profile.quality.observations.map((obs, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2.5 rounded-md border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700"
                  >
                    <span className="font-mono text-teal-700 font-bold">&bull;</span>
                    <span>{obs}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 5: STATISTICS */}
        {activeTab === "statistics" && (
          <div className="space-y-8">
            {profile.columns.some((c) => c.numeric_stats) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Numerical Distributions &amp; Moments
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                        <TableHead className="text-xs text-slate-900 font-semibold">Feature</TableHead>
                        <TableHead className="text-xs text-slate-900 font-semibold">Mean</TableHead>
                        <TableHead className="text-xs text-slate-900 font-semibold">Median</TableHead>
                        <TableHead className="text-xs text-slate-900 font-semibold">Min</TableHead>
                        <TableHead className="text-xs text-slate-900 font-semibold">25% (Q1)</TableHead>
                        <TableHead className="text-xs text-slate-900 font-semibold">75% (Q3)</TableHead>
                        <TableHead className="text-xs text-slate-900 font-semibold">Max</TableHead>
                        <TableHead className="text-xs text-slate-900 font-semibold">Std Dev</TableHead>
                        <TableHead className="text-xs text-slate-900 font-semibold">Zero Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.columns
                        .filter((c) => c.numeric_stats)
                        .map((col) => {
                          const s = col.numeric_stats!;
                          return (
                            <TableRow key={col.name} className="border-slate-100 hover:bg-slate-50/60 font-mono text-xs">
                              <TableCell className="font-sans font-semibold text-slate-900">{col.name}</TableCell>
                              <TableCell className="text-slate-700">{s.mean ?? "-"}</TableCell>
                              <TableCell className="text-slate-700">{s.median ?? "-"}</TableCell>
                              <TableCell className="text-slate-700">{s.min ?? "-"}</TableCell>
                              <TableCell className="text-slate-600">{s.q25 ?? "-"}</TableCell>
                              <TableCell className="text-slate-600">{s.q75 ?? "-"}</TableCell>
                              <TableCell className="text-slate-700">{s.max ?? "-"}</TableCell>
                              <TableCell className="text-slate-600">{s.std ?? "-"}</TableCell>
                              <TableCell className="text-slate-600">{s.zeros_count}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {profile.columns.some((c) => c.categorical_stats) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Categorical Frequency Distributions
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {profile.columns
                    .filter((c) => c.categorical_stats)
                    .map((col) => {
                      const cat = col.categorical_stats!;
                      return (
                        <Card key={col.name} className="p-5 bg-white border-slate-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-semibold text-sm text-slate-900">{col.name}</span>
                            <Badge variant="outline" size="sm">
                              {cat.cardinality} distinct values
                            </Badge>
                          </div>
                          <div className="space-y-2.5 pt-1">
                            {cat.top_values.map((v, i) => (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-mono text-slate-700 truncate max-w-[200px]">
                                    {v.value || '"" (empty)'}
                                  </span>
                                  <span className="text-slate-600 font-mono text-[11px]">
                                    {v.count} ({v.percentage}%)
                                  </span>
                                </div>
                                <Progress value={v.percentage} variant="secondary" />
                              </div>
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </PageContainer>

      {/* Finding Detail Inspection Modal (Phase 3) */}
      <FindingDetailModal
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />

      {/* Pattern Detail Inspection Modal (Phase 4) */}
      <PatternDetailModal
        pattern={selectedPattern}
        onClose={() => setSelectedPattern(null)}
      />

      {/* Hypothesis Detail Inspection Modal (Phase 5) */}
      <HypothesisDetailModal
        hypothesis={selectedHypothesis}
        allEvidence={evidenceSummary?.evidence}
        onClose={() => setSelectedHypothesis(null)}
      />

      {/* Investigation Thread Inspection Modal (Phase 5) */}
      <InvestigationThreadModal
        thread={selectedThread}
        hypotheses={evidenceSummary?.hypotheses}
        evidence={evidenceSummary?.evidence}
        onClose={() => setSelectedThread(null)}
        onSelectHypothesis={(hyp) => {
          setSelectedThread(null);
          setSelectedHypothesis(hyp);
        }}
      />
    </div>
  );
}
