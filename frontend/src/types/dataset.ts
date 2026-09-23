export interface NumericStats {
  mean?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
  std?: number | null;
  q25?: number | null;
  q75?: number | null;
  zeros_count: number;
}

export interface CategoricalValueCount {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoricalStats {
  cardinality: number;
  top_values: CategoricalValueCount[];
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  inferred_type: "numeric" | "categorical" | "datetime" | "boolean" | "id" | "text" | string;
  total_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  unique_percentage: number;
  is_likely_id: boolean;
  is_temporal: boolean;
  is_constant: boolean;
  numeric_stats?: NumericStats | null;
  categorical_stats?: CategoricalStats | null;
}

export interface QualityScore {
  overall_score: number;
  grade: "A" | "B" | "C" | "D" | "F" | string;
  missing_percentage: number;
  duplicate_percentage: number;
  invalid_percentage: number;
  consistency_percentage: number;
  completeness_score: number;
  uniqueness_score: number;
  observations: string[];
}

export interface DatasetMetadata {
  id: string;
  name: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  row_count: number;
  column_count: number;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface DatasetProfile {
  dataset_id: string;
  row_count: number;
  column_count: number;
  duplicate_rows: number;
  duplicate_percentage: number;
  columns: ColumnProfile[];
  likely_id_columns: string[];
  temporal_columns: string[];
  numeric_columns: string[];
  categorical_columns: string[];
  quality: QualityScore;
}

export interface DatasetResponse {
  metadata: DatasetMetadata;
  profile?: DatasetProfile;
}

export interface DatasetPreview {
  dataset_id: string;
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
  limit: number;
  offset: number;
}

// Backwards compatibility alias
export type Dataset = DatasetMetadata;

