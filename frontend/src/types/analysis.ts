export type FindingSeverity = "high" | "medium" | "low";
export type FindingType = "anomaly" | "trend" | "statistical";

export interface ExpectedRange {
  lower?: number | null;
  upper?: number | null;
}

export interface AnalysisFinding {
  finding_id: string;
  dataset_id: string;
  type: FindingType | string;
  subtype: string;
  title: string;
  description: string;
  column?: string | null;
  row_reference?: number | string | null;
  observed_value?: any;
  expected_value?: any;
  expected_range?: ExpectedRange | null;
  severity: FindingSeverity | string;
  score: number; // 0 - 100
  method: string;
  detected_by: string[];
  confidence: number;
  deviation_percentage?: number | null;
  metadata?: Record<string, any>;
}

export interface AnalysisSummary {
  dataset_id: string;
  status: "completed" | "empty" | "failed" | string;
  total_findings: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  analysis_methods: string[];
  findings: AnalysisFinding[];
  analyzed_at: string;
  duration_ms?: number | null;
}
