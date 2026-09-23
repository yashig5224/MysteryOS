from typing import List, Dict, Any, Optional, Union
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from enum import Enum


class FindingType(str, Enum):
    ANOMALY = "anomaly"
    TREND = "trend"
    STATISTICAL = "statistical"


class FindingSubtype(str, Enum):
    NUMERIC_OUTLIER = "numeric_outlier"
    STATISTICAL_OUTLIER = "statistical_outlier"
    CATEGORICAL_RARE = "categorical_rare"
    CATEGORICAL_DOMINANT = "categorical_dominant"
    TEMPORAL_ANOMALY = "temporal_anomaly"
    SUDDEN_INCREASE = "sudden_increase"
    SUDDEN_DECREASE = "sudden_decrease"
    TREND_CHANGE = "trend_change"
    HIGH_VARIANCE = "high_variance"
    SIGNIFICANT_CHANGE = "significant_change"


class FindingSeverity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ExpectedRange(BaseModel):
    lower: Optional[float] = None
    upper: Optional[float] = None


class AnalysisFinding(BaseModel):
    finding_id: str
    dataset_id: str
    type: str  # anomaly, trend, statistical
    subtype: str  # numeric_outlier, etc.
    title: str
    description: str
    column: Optional[str] = None
    row_reference: Optional[Union[int, str]] = None
    observed_value: Optional[Any] = None
    expected_value: Optional[Any] = None
    expected_range: Optional[ExpectedRange] = None
    severity: str  # high, medium, low
    score: int  # 0 - 100
    method: str
    detected_by: List[str] = Field(default_factory=list)
    confidence: float = 0.8
    deviation_percentage: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AnalysisSummary(BaseModel):
    dataset_id: str
    status: str  # completed, empty, failed
    total_findings: int
    high_count: int
    medium_count: int
    low_count: int
    analysis_methods: List[str] = Field(default_factory=list)
    findings: List[AnalysisFinding] = Field(default_factory=list)
    analyzed_at: str
    duration_ms: Optional[float] = None


class AnalyzeRequest(BaseModel):
    force: bool = False
