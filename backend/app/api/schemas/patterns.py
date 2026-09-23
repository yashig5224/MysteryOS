from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum


class PatternType(str, Enum):
    CORRELATION = "correlation"
    TREND = "trend"
    GROUP_DIFFERENCE = "group_difference"
    CHANGE_POINT = "change_point"
    CROSS_FINDING = "cross_finding"
    GENERAL = "general"


class RelationshipType(str, Enum):
    CORRELATES_WITH = "CORRELATES_WITH"
    OCCURS_BEFORE = "OCCURS_BEFORE"
    CHANGES_WITH = "CHANGES_WITH"
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    RELATED_TO = "RELATED_TO"
    SAME_PERIOD = "SAME_PERIOD"


class TimelineEventType(str, Enum):
    ANOMALY = "anomaly"
    TREND = "trend"
    CHANGE = "change"
    STATISTICAL = "statistical"
    PATTERN = "pattern"
    DATA_EVENT = "data_event"


class CorrelationPair(BaseModel):
    var1: str
    var2: str
    coefficient: float
    method: str = "pearson"  # pearson, spearman
    direction: str = "positive"  # positive, negative
    strength: str = "strong"  # very_strong, strong, moderate, weak
    sample_size: int
    p_value: Optional[float] = None


class Pattern(BaseModel):
    pattern_id: str
    dataset_id: str
    type: str  # correlation, trend, group_difference, change_point, cross_finding
    title: str
    description: str
    columns: List[str] = Field(default_factory=list)
    strength: int  # 0 - 100
    direction: Optional[str] = None  # positive, negative, upward, downward
    significance: str = "medium"  # high, medium, low
    supporting_finding_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Relationship(BaseModel):
    relationship_id: str
    dataset_id: str
    source: str
    target: str
    relationship_type: str  # CORRELATES_WITH, OCCURS_BEFORE, etc.
    strength: int  # 0 - 100
    description: str
    supporting_finding_ids: List[str] = Field(default_factory=list)
    supporting_pattern_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TimelineEvent(BaseModel):
    event_id: str
    dataset_id: str
    date: str  # timestamp / date string
    title: str
    description: str
    event_type: str  # anomaly, trend, change, statistical, pattern, data_event
    importance: int  # 0 - 100
    column: Optional[str] = None
    source_finding_ids: List[str] = Field(default_factory=list)
    source_pattern_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PatternSummary(BaseModel):
    dataset_id: str
    status: str  # completed, empty, failed
    total_patterns: int
    total_relationships: int
    total_timeline_events: int
    correlations: List[CorrelationPair] = Field(default_factory=list)
    patterns: List[Pattern] = Field(default_factory=list)
    relationships: List[Relationship] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    analyzed_at: str
    duration_ms: Optional[float] = None


class PatternAnalyzeRequest(BaseModel):
    force: bool = False
