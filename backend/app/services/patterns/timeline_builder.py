import uuid
from typing import List, Optional
import pandas as pd

from app.api.schemas.patterns import TimelineEvent, TimelineEventType, Pattern
from app.api.schemas.dataset import DatasetProfile
from app.api.schemas.analysis import AnalysisFinding
from app.services.patterns.scoring import calculate_event_importance


def build_investigation_timeline(
    df: pd.DataFrame,
    dataset_id: str,
    patterns: List[Pattern],
    profile: Optional[DatasetProfile] = None,
    findings: Optional[List[AnalysisFinding]] = None,
) -> List[TimelineEvent]:
    """
    Construct a unified, chronological timeline of critical anomalies, structural shifts, and pattern milestones.
    """
    events: List[TimelineEvent] = []
    seen_event_keys = set()

    time_col = profile.temporal_columns[0] if (profile and profile.temporal_columns) else None

    # 1. Timeline Events from Phase 3 Temporal & Anomaly Findings
    if findings:
        for f in findings:
            date_str = None
            if f.metadata and "timestamp" in f.metadata:
                date_str = str(f.metadata["timestamp"])
            elif time_col and f.row_reference is not None and not df.empty:
                try:
                    row_idx = int(f.row_reference)
                    if 0 <= row_idx < len(df):
                        val = df.iloc[row_idx][time_col]
                        if pd.notna(val):
                            date_str = str(val)
                except Exception:
                    pass

            if date_str:
                event_key = (date_str, f.column, f.finding_id)
                if event_key not in seen_event_keys:
                    seen_event_keys.add(event_key)
                    importance = calculate_event_importance(
                        severity=f.severity,
                        base_score=f.score,
                        supporting_findings_count=1,
                    )
                    evt = TimelineEvent(
                        event_id=f"evt_fnd_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        date=date_str,
                        title=f"{f.title}",
                        description=f.description,
                        event_type=TimelineEventType.ANOMALY.value if f.type == "anomaly" else TimelineEventType.TREND.value,
                        importance=importance,
                        column=f.column,
                        source_finding_ids=[f.finding_id],
                        source_pattern_ids=[],
                        metadata={"severity": f.severity, "score": f.score, "method": f.method},
                    )
                    events.append(evt)

    # 2. Timeline Events from Phase 4 Patterns (e.g. Change Points and Trends)
    for p in patterns:
        if p.type == "change_point" and "change_point_date" in p.metadata:
            cp_date = p.metadata["change_point_date"]
            event_key = (cp_date, str(p.columns), p.pattern_id)
            if event_key not in seen_event_keys:
                seen_event_keys.add(event_key)
                importance = calculate_event_importance(
                    severity="high" if p.strength >= 75 else "medium",
                    base_score=p.strength,
                    supporting_findings_count=len(p.supporting_finding_ids),
                    has_pattern=True,
                )
                evt = TimelineEvent(
                    event_id=f"evt_pat_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    date=cp_date,
                    title=f"{p.title}",
                    description=p.description,
                    event_type=TimelineEventType.CHANGE.value,
                    importance=importance,
                    column=p.columns[0] if p.columns else None,
                    source_finding_ids=p.supporting_finding_ids,
                    source_pattern_ids=[p.pattern_id],
                    metadata=p.metadata,
                )
                events.append(evt)

        elif p.type == "trend" and "start_date" in p.metadata:
            trend_date = p.metadata["start_date"]
            event_key = (trend_date, str(p.columns), p.pattern_id)
            if event_key not in seen_event_keys:
                seen_event_keys.add(event_key)
                importance = calculate_event_importance(
                    severity="medium",
                    base_score=p.strength,
                    supporting_findings_count=len(p.supporting_finding_ids),
                    has_pattern=True,
                )
                evt = TimelineEvent(
                    event_id=f"evt_trd_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    date=trend_date,
                    title=f"Trajectory: {p.title}",
                    description=p.description,
                    event_type=TimelineEventType.TREND.value,
                    importance=importance,
                    column=p.columns[0] if p.columns else None,
                    source_finding_ids=p.supporting_finding_ids,
                    source_pattern_ids=[p.pattern_id],
                    metadata=p.metadata,
                )
                events.append(evt)

    # Sort events chronologically
    events.sort(key=lambda x: str(x.date))
    return events
