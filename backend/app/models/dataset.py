from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime, timezone


@dataclass
class DatasetModel:
    id: str
    name: str
    filename: str
    file_type: str
    size_bytes: int
    file_path: str
    row_count: int = 0
    column_count: int = 0
    health_score: int = 100
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    profile: Optional[Dict[str, Any]] = None


