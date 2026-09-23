from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class NumericStats(BaseModel):
    mean: Optional[float] = None
    median: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    std: Optional[float] = None
    q25: Optional[float] = None
    q75: Optional[float] = None
    zeros_count: int = 0


class CategoricalValueCount(BaseModel):
    value: str
    count: int
    percentage: float


class CategoricalStats(BaseModel):
    cardinality: int
    top_values: List[CategoricalValueCount] = Field(default_factory=list)


class ColumnProfile(BaseModel):
    name: str
    dtype: str
    inferred_type: str  # numeric, categorical, datetime, boolean, id, text
    total_count: int
    null_count: int
    null_percentage: float
    unique_count: int
    unique_percentage: float
    is_likely_id: bool = False
    is_temporal: bool = False
    is_constant: bool = False
    numeric_stats: Optional[NumericStats] = None
    categorical_stats: Optional[CategoricalStats] = None


class QualityScore(BaseModel):
    overall_score: int  # 0 - 100
    grade: str  # A, B, C, D, F
    missing_percentage: float
    duplicate_percentage: float
    invalid_percentage: float
    consistency_percentage: float
    completeness_score: float
    uniqueness_score: float
    observations: List[str] = Field(default_factory=list)


class DatasetMetadata(BaseModel):
    id: str
    name: str
    filename: str
    file_type: str
    size_bytes: int
    row_count: int
    column_count: int
    health_score: int
    created_at: str
    updated_at: str


class DatasetProfile(BaseModel):
    dataset_id: str
    row_count: int
    column_count: int
    duplicate_rows: int
    duplicate_percentage: float
    columns: List[ColumnProfile]
    likely_id_columns: List[str] = Field(default_factory=list)
    temporal_columns: List[str] = Field(default_factory=list)
    numeric_columns: List[str] = Field(default_factory=list)
    categorical_columns: List[str] = Field(default_factory=list)
    quality: QualityScore


class DatasetResponse(BaseModel):
    metadata: DatasetMetadata
    profile: Optional[DatasetProfile] = None


class DatasetPreview(BaseModel):
    dataset_id: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    limit: int
    offset: int

