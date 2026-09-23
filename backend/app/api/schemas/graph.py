from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class GraphNodeType(str, Enum):
    FINDING = "finding"
    PATTERN = "pattern"
    EVIDENCE = "evidence"
    HYPOTHESIS = "hypothesis"
    THREAD = "thread"
    EVENT = "event"


class GraphEdgeType(str, Enum):
    SUPPORTS = "SUPPORTS"
    CONTRADICTS = "CONTRADICTS"
    DERIVED_FROM = "DERIVED_FROM"
    RELATED_TO = "RELATED_TO"
    OCCURS_BEFORE = "OCCURS_BEFORE"
    INVESTIGATED_IN = "INVESTIGATED_IN"
    GROUNDS_EVIDENCE = "GROUNDS_EVIDENCE"
    CORRELATES_WITH = "CORRELATES_WITH"


class GraphNode(BaseModel):
    id: str = Field(..., description="Canonical ID e.g. fnd_001, pat_001, evd_001, hyp_001, thread_001, evt_001")
    label: str = Field(..., description="Display label e.g. [EVD-001] Pricing Disparity")
    type: str = Field(..., description="finding | pattern | evidence | hypothesis | thread | event")
    title: str
    description: Optional[str] = None
    severity: Optional[str] = None
    strength: Optional[int] = None
    confidence: Optional[int] = None
    polarity: Optional[str] = None  # support | contradict | neutral
    columns: List[str] = Field(default_factory=list)
    thread_ids: List[str] = Field(default_factory=list)
    tier: Optional[int] = Field(None, description="Visual layer/tier (1=Finding/Data, 2=Pattern, 3=Evidence, 4=Hypothesis, 5=Thread, 0=Event)")
    position: Optional[Dict[str, float]] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str  # SUPPORTS, CONTRADICTS, DERIVED_FROM, etc.
    type: str = "default"
    strength: Optional[int] = None
    polarity: Optional[str] = None  # support | contradict


class KnowledgeGraphResponse(BaseModel):
    dataset_id: str
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    total_nodes: int = 0
    total_edges: int = 0
    node_type_counts: Dict[str, int] = Field(default_factory=dict)
    thread_ids: List[str] = Field(default_factory=list)


class GraphNodeDetailResponse(BaseModel):
    dataset_id: str
    node: GraphNode
    connected_nodes: List[GraphNode] = Field(default_factory=list)
    connected_edges: List[GraphEdge] = Field(default_factory=list)
    related_threads: List[str] = Field(default_factory=list)
    raw_artifact: Dict[str, Any] = Field(default_factory=dict)
