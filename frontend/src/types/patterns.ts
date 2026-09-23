export type PatternType =
  | "correlation"
  | "trend"
  | "group_difference"
  | "change_point"
  | "cross_finding"
  | "general";

export type RelationshipType =
  | "CORRELATES_WITH"
  | "OCCURS_BEFORE"
  | "CHANGES_WITH"
  | "ASSOCIATED_WITH"
  | "RELATED_TO"
  | "SAME_PERIOD";

export type TimelineEventType =
  | "anomaly"
  | "trend"
  | "change"
  | "statistical"
  | "pattern"
  | "data_event";

export interface CorrelationPair {
  var1: string;
  var2: string;
  coefficient: number;
  method: "pearson" | "spearman" | string;
  direction: "positive" | "negative" | string;
  strength: "very_strong" | "strong" | "moderate" | "weak" | string;
  sample_size: number;
  p_value?: number | null;
}

export interface Pattern {
  pattern_id: string;
  dataset_id: string;
  type: PatternType | string;
  title: string;
  description: string;
  columns: string[];
  strength: number; // 0 - 100
  direction?: string | null;
  significance: "high" | "medium" | "low" | string;
  supporting_finding_ids: string[];
  metadata?: Record<string, any>;
}

export interface Relationship {
  relationship_id: string;
  dataset_id: string;
  source: string;
  target: string;
  relationship_type: RelationshipType | string;
  strength: number; // 0 - 100
  description: string;
  supporting_finding_ids: string[];
  supporting_pattern_ids: string[];
  metadata?: Record<string, any>;
}

export interface TimelineEvent {
  event_id: string;
  dataset_id: string;
  date: string;
  title: string;
  description: string;
  event_type: TimelineEventType | string;
  importance: number; // 0 - 100
  column?: string | null;
  source_finding_ids: string[];
  source_pattern_ids: string[];
  metadata?: Record<string, any>;
}

export interface PatternSummary {
  dataset_id: string;
  status: "completed" | "empty" | "failed" | string;
  total_patterns: number;
  total_relationships: number;
  total_timeline_events: number;
  correlations: CorrelationPair[];
  patterns: Pattern[];
  relationships: Relationship[];
  timeline: TimelineEvent[];
  analyzed_at: string;
  duration_ms?: number | null;
}
