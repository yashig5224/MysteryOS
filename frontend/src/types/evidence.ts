export type EvidenceType =
  | "ANOMALY_EVIDENCE"
  | "PATTERN_EVIDENCE"
  | "CORRELATION_EVIDENCE"
  | "TEMPORAL_EVIDENCE"
  | "TREND_EVIDENCE"
  | "GROUP_DIFFERENCE_EVIDENCE"
  | "CHANGE_POINT_EVIDENCE"
  | "STATISTICAL_EVIDENCE"
  | string;

export type EvidencePolarity = "support" | "contradict" | "neutral" | string;

export interface Evidence {
  evidence_id: string;
  dataset_id: string;
  title: string;
  description: string;
  evidence_type: EvidenceType;
  strength: number; // 0 - 100
  polarity: EvidencePolarity; // support, contradict, neutral
  supports_pattern_ids?: string[];
  related_finding_ids?: string[];
  related_relationship_ids?: string[];
  related_event_ids?: string[];
  columns: string[];
  source_metadata?: Record<string, any>;
}

export interface EvidenceCluster {
  cluster_id: string;
  dataset_id: string;
  title: string;
  summary: string;
  strength: number; // 0 - 100
  evidence_ids: string[];
  finding_ids: string[];
  pattern_ids: string[];
  relationship_ids: string[];
  timeline_event_ids: string[];
  primary_columns: string[];
}

export interface Hypothesis {
  hypothesis_id: string;
  dataset_id: string;
  title: string;
  statement: string;
  status: string; // candidate, under_review, etc.
  confidence: number; // 0 - 100
  evidence_strength: number; // 0 - 100
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
  contradictory_evidence_ids?: string[];
  supporting_pattern_ids: string[];
  related_relationship_ids?: string[];
  timeline_event_ids?: string[];
  reasoning: string;
  primary_columns: string[];
}

export interface InvestigationThread {
  thread_id: string;
  dataset_id: string;
  title: string;
  priority: number; // 0 - 100
  status: string; // open, active, resolved
  summary: string;
  hypothesis_ids: string[];
  evidence_ids: string[];
  pattern_ids: string[];
  finding_ids: string[];
  timeline_event_ids: string[];
  primary_columns: string[];
}

export interface InvestigationGraphNode {
  id: string;
  label: string;
  type: "finding" | "pattern" | "evidence" | "hypothesis" | "event" | string;
  data?: Record<string, any>;
}

export interface InvestigationGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  strength?: number | null;
}

export interface InvestigationGraphData {
  nodes: InvestigationGraphNode[];
  edges: InvestigationGraphEdge[];
}

export interface EvidenceSummary {
  dataset_id: string;
  status: "completed" | "empty" | "failed" | string;
  total_evidence: number;
  strong_evidence: number;
  moderate_evidence: number;
  weak_evidence: number;
  total_hypotheses: number;
  total_investigation_threads: number;
  top_threads: InvestigationThread[];
  evidence: Evidence[];
  hypotheses: Hypothesis[];
  clusters: EvidenceCluster[];
  threads: InvestigationThread[];
  graph_data: InvestigationGraphData;
  analyzed_at: string;
  duration_ms?: number | null;
}

export interface EvidenceAnalyzeRequest {
  force?: boolean;
}
