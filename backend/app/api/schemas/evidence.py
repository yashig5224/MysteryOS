from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum


class EvidenceType(str, Enum):
    ANOMALY_EVIDENCE = "ANOMALY_EVIDENCE"
    PATTERN_EVIDENCE = "PATTERN_EVIDENCE"
    CORRELATION_EVIDENCE = "CORRELATION_EVIDENCE"
    TEMPORAL_EVIDENCE = "TEMPORAL_EVIDENCE"
    TREND_EVIDENCE = "TREND_EVIDENCE"
    GROUP_DIFFERENCE_EVIDENCE = "GROUP_DIFFERENCE_EVIDENCE"
    CHANGE_POINT_EVIDENCE = "CHANGE_POINT_EVIDENCE"
    STATISTICAL_EVIDENCE = "STATISTICAL_EVIDENCE"


class EvidencePolarity(str, Enum):
    SUPPORT = "support"
    CONTRADICT = "contradict"
    NEUTRAL = "neutral"


class Evidence(BaseModel):
    evidence_id: str
    dataset_id: str
    title: str
    description: str
    evidence_type: str  # ANOMALY_EVIDENCE, PATTERN_EVIDENCE, etc.
    strength: int  # 0 - 100
    polarity: str = "support"  # support, contradict, neutral
    supports_pattern_ids: List[str] = Field(default_factory=list)
    related_finding_ids: List[str] = Field(default_factory=list)
    related_relationship_ids: List[str] = Field(default_factory=list)
    related_event_ids: List[str] = Field(default_factory=list)
    columns: List[str] = Field(default_factory=list)
    source_metadata: Dict[str, Any] = Field(default_factory=dict)


class EvidenceCluster(BaseModel):
    cluster_id: str
    dataset_id: str
    title: str
    summary: str
    strength: int  # 0 - 100
    evidence_ids: List[str] = Field(default_factory=list)
    finding_ids: List[str] = Field(default_factory=list)
    pattern_ids: List[str] = Field(default_factory=list)
    relationship_ids: List[str] = Field(default_factory=list)
    timeline_event_ids: List[str] = Field(default_factory=list)
    primary_columns: List[str] = Field(default_factory=list)


class Hypothesis(BaseModel):
    hypothesis_id: str
    dataset_id: str
    title: str
    statement: str
    status: str = "candidate"  # candidate, under_review
    confidence: int  # 0 - 100
    evidence_strength: int  # 0 - 100
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradicting_evidence_ids: List[str] = Field(default_factory=list)
    supporting_pattern_ids: List[str] = Field(default_factory=list)
    related_relationship_ids: List[str] = Field(default_factory=list)
    timeline_event_ids: List[str] = Field(default_factory=list)
    reasoning: str
    primary_columns: List[str] = Field(default_factory=list)


class InvestigationThread(BaseModel):
    thread_id: str
    dataset_id: str
    title: str
    priority: int  # 0 - 100
    status: str = "open"  # open, active, resolved
    summary: str
    hypothesis_ids: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    pattern_ids: List[str] = Field(default_factory=list)
    finding_ids: List[str] = Field(default_factory=list)
    timeline_event_ids: List[str] = Field(default_factory=list)
    primary_columns: List[str] = Field(default_factory=list)


class InvestigationGraphNode(BaseModel):
    id: str
    label: str
    type: str  # finding, pattern, evidence, hypothesis, event
    data: Dict[str, Any] = Field(default_factory=dict)


class InvestigationGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str  # SUPPORTS, CONTRADICTS, DERIVED_FROM, RELATED_TO, OCCURS_BEFORE
    strength: Optional[int] = None


class InvestigationGraphData(BaseModel):
    nodes: List[InvestigationGraphNode] = Field(default_factory=list)
    edges: List[InvestigationGraphEdge] = Field(default_factory=list)


class EvidenceSummary(BaseModel):
    dataset_id: str
    status: str  # completed, empty, failed
    total_evidence: int
    strong_evidence: int
    moderate_evidence: int
    weak_evidence: int
    total_hypotheses: int
    total_investigation_threads: int
    top_threads: List[InvestigationThread] = Field(default_factory=list)
    evidence: List[Evidence] = Field(default_factory=list)
    hypotheses: List[Hypothesis] = Field(default_factory=list)
    clusters: List[EvidenceCluster] = Field(default_factory=list)
    threads: List[InvestigationThread] = Field(default_factory=list)
    graph_data: InvestigationGraphData = Field(default_factory=InvestigationGraphData)
    analyzed_at: str
    duration_ms: Optional[float] = None


class EvidenceAnalyzeRequest(BaseModel):
    force: bool = False
