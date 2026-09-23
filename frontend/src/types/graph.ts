export type GraphNodeType =
  | "finding"
  | "pattern"
  | "evidence"
  | "hypothesis"
  | "thread"
  | "event";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType | string;
  title: string;
  description?: string;
  severity?: string;
  strength?: number;
  confidence?: number;
  polarity?: "support" | "contradict" | "neutral" | string;
  columns?: string[];
  thread_ids?: string[];
  tier?: number;
  position?: { x: number; y: number };
  data?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type?: string;
  strength?: number;
  polarity?: "support" | "contradict" | string;
}

export interface KnowledgeGraphResponse {
  dataset_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
  node_type_counts: Record<string, number>;
  thread_ids: string[];
}

export interface GraphNodeDetailResponse {
  dataset_id: string;
  node: GraphNode;
  connected_nodes: GraphNode[];
  connected_edges: GraphEdge[];
  related_threads: string[];
  raw_artifact: Record<string, any>;
}
