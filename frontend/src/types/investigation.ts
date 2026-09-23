export type InvestigationMode =
  | "overview"
  | "anomaly"
  | "pattern"
  | "evidence"
  | "hypothesis"
  | "timeline"
  | "thread"
  | "next_step";

export interface InvestigationSource {
  type: "evidence" | "pattern" | "finding" | "hypothesis" | "thread" | "timeline" | string;
  id: string;
  title?: string;
  description?: string;
  strength?: number;
}

export interface InvestigationRequest {
  question: string;
  thread_id?: string;
  hypothesis_id?: string;
  mode?: InvestigationMode;
}

export interface InvestigationResponse {
  response_id: string;
  dataset_id: string;
  question: string;
  answer: string;
  confidence: "low" | "moderate" | "high" | string;
  mode: string;
  sources: InvestigationSource[];
  related_findings: string[];
  related_hypotheses: string[];
  related_threads: string[];
  suggested_questions: string[];
  created_at: string;
  duration_ms: number;
  provider: string;
  model: string;
}

export interface InvestigationMessage {
  message_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: InvestigationSource[];
  suggested_questions?: string[];
  mode?: string;
  timestamp: string;
}

export interface InvestigationHistoryResponse {
  dataset_id: string;
  messages: InvestigationMessage[];
  total_messages: number;
}

export interface SuggestedQuestion {
  question_id: string;
  question: string;
  category: "anomaly" | "pattern" | "hypothesis" | "contradiction" | "timeline" | "next_step" | string;
  target_id?: string;
}

export interface InvestigationSummary {
  dataset_id: string;
  title: string;
  primary_anomaly?: string;
  important_pattern?: string;
  leading_hypothesis?: string;
  supporting_evidence_count: number;
  contradictory_evidence_count: number;
  candidate_explanation?: string;
  confidence: "low" | "moderate" | "high" | string;
  recommended_next_step?: string;
  key_sources: InvestigationSource[];
}
