from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class InvestigationMode(str, Enum):
    OVERVIEW = "overview"
    ANOMALY = "anomaly"
    PATTERN = "pattern"
    EVIDENCE = "evidence"
    HYPOTHESIS = "hypothesis"
    TIMELINE = "timeline"
    THREAD = "thread"
    NEXT_STEP = "next_step"


class InvestigationSource(BaseModel):
    type: str = Field(..., description="Type of source: evidence, pattern, finding, hypothesis, thread, timeline, relationship")
    id: str = Field(..., description="Unique MysteryOS entity ID (e.g., evd_001, pat_002, fnd_003)")
    title: Optional[str] = Field(None, description="Short human-readable label")
    description: Optional[str] = Field(None, description="Summary or observation text")
    strength: Optional[float] = Field(None, description="Evidence or finding strength score (0-100)")


class InvestigationRequest(BaseModel):
    question: str = Field(..., description="User query or investigation prompt")
    thread_id: Optional[str] = Field(None, description="Optional active investigation thread ID")
    hypothesis_id: Optional[str] = Field(None, description="Optional focus hypothesis ID")
    mode: Optional[InvestigationMode] = Field(None, description="Investigation mode")


class InvestigationResponse(BaseModel):
    response_id: str
    dataset_id: str
    question: str
    answer: str
    confidence: str = Field(default="moderate", description="low, moderate, high")
    mode: str = Field(default="overview")
    sources: List[InvestigationSource] = Field(default_factory=list)
    related_findings: List[str] = Field(default_factory=list)
    related_hypotheses: List[str] = Field(default_factory=list)
    related_threads: List[str] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list)
    created_at: str
    duration_ms: float
    provider: str = "mock"
    model: str = "default"


class InvestigationMessage(BaseModel):
    message_id: str
    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    sources: List[InvestigationSource] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list)
    mode: Optional[str] = None
    timestamp: str


class InvestigationHistoryResponse(BaseModel):
    dataset_id: str
    messages: List[InvestigationMessage] = Field(default_factory=list)
    total_messages: int = 0


class SuggestedQuestion(BaseModel):
    question_id: str
    question: str
    category: str = Field(..., description="'anomaly', 'pattern', 'hypothesis', 'contradiction', 'timeline', 'next_step'")
    target_id: Optional[str] = None


class InvestigationSummary(BaseModel):
    dataset_id: str
    title: str
    primary_anomaly: Optional[str] = None
    important_pattern: Optional[str] = None
    leading_hypothesis: Optional[str] = None
    supporting_evidence_count: int = 0
    contradictory_evidence_count: int = 0
    candidate_explanation: Optional[str] = None
    confidence: str = "moderate"
    recommended_next_step: Optional[str] = None
    key_sources: List[InvestigationSource] = Field(default_factory=list)
