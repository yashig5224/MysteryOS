import os
import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

import pandas as pd

from app.api.schemas.patterns import (
    PatternSummary,
    Pattern,
    Relationship,
    TimelineEvent,
    CorrelationPair,
    PatternType,
)
from app.services.ingestion.dataset_store import dataset_store
from app.services.analysis.engine import analysis_engine
from app.services.patterns.correlation_analyzer import analyze_correlations
from app.services.patterns.trend_analyzer import analyze_trends
from app.services.patterns.group_analyzer import analyze_group_differences
from app.services.patterns.change_point_analyzer import analyze_change_points
from app.services.patterns.relationship_analyzer import analyze_relationships
from app.services.patterns.timeline_builder import build_investigation_timeline
from app.services.patterns.scoring import calculate_pattern_strength, classify_significance


class PatternEngine:
    """
    Central orchestrator for discovering correlations, trends, group disparities,
    cross-finding patterns, relationships, and investigation timelines.
    """

    def __init__(self, processed_dir: Optional[Path] = None):
        if processed_dir is None:
            self.processed_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "processed"
        else:
            self.processed_dir = processed_dir
        self.processed_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_path(self, dataset_id: str) -> Path:
        return self.processed_dir / f"patterns_{dataset_id}.json"

    def analyze(self, dataset_id: str, force: bool = False) -> PatternSummary:
        """
        Execute full pattern, relationship, and timeline discovery on a dataset.
        Returns cached results unless force=True.
        """
        cache_path = self._get_cache_path(dataset_id)
        if not force and cache_path.exists():
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return PatternSummary(**data)
            except Exception:
                pass

        start_time = time.time()

        # 1. Load dataset
        df = dataset_store.get_dataset_df(dataset_id)
        if df is None:
            raise FileNotFoundError(f"Dataset '{dataset_id}' not found.")

        # 2. Load profile
        profile = dataset_store.get_dataset_profile(dataset_id)

        # 3. Load Phase 3 findings
        try:
            analysis_res = analysis_engine.analyze(dataset_id, force=False)
            findings = analysis_res.findings
        except Exception:
            findings = []

        # 4. Run Analyzers
        correlations, corr_patterns = analyze_correlations(df, dataset_id, profile, findings)
        trend_patterns = analyze_trends(df, dataset_id, profile, findings)
        group_patterns = analyze_group_differences(df, dataset_id, profile, findings)
        change_patterns = analyze_change_points(df, dataset_id, profile, findings)

        # 5. Discover Cross-Finding Patterns
        cross_patterns = self._discover_cross_finding_patterns(dataset_id, findings)

        # Combine all patterns
        all_patterns = corr_patterns + trend_patterns + group_patterns + change_patterns + cross_patterns
        all_patterns.sort(key=lambda x: x.strength, reverse=True)

        # 6. Discover Relationships
        relationships = analyze_relationships(dataset_id, all_patterns, correlations, findings)

        # 7. Build Timeline
        timeline = build_investigation_timeline(df, dataset_id, all_patterns, profile, findings)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        summary = PatternSummary(
            dataset_id=dataset_id,
            status="completed" if (all_patterns or correlations or timeline) else "empty",
            total_patterns=len(all_patterns),
            total_relationships=len(relationships),
            total_timeline_events=len(timeline),
            correlations=correlations,
            patterns=all_patterns,
            relationships=relationships,
            timeline=timeline,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=duration_ms,
        )

        # Save to cache
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(summary.model_dump(), f, indent=2)
        except Exception:
            pass

        return summary

    def _discover_cross_finding_patterns(
        self,
        dataset_id: str,
        findings: List[Any],
    ) -> List[Pattern]:
        """
        Synthesize cross-finding patterns when multiple anomalies occur in identical columns or periods.
        """
        cross_patterns: List[Pattern] = []
        if len(findings) < 2:
            return cross_patterns

        # Cluster findings by column
        col_findings: Dict[str, List[Any]] = {}
        for f in findings:
            if f.column:
                col_findings.setdefault(f.column, []).append(f)

        for col, col_fnds in col_findings.items():
            if len(col_fnds) >= 2:
                supporting_ids = [f.finding_id for f in col_fnds]
                avg_score = sum(f.score for f in col_fnds) / len(col_fnds)
                strength = calculate_pattern_strength(
                    base_magnitude=avg_score / 100.0,
                    sample_size=len(col_fnds) * 5,
                    supporting_count=len(supporting_ids),
                )
                significance = classify_significance(strength)

                p = Pattern(
                    pattern_id=f"pat_cross_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    type=PatternType.CROSS_FINDING.value,
                    title=f"Multi-Observation Anomaly Cluster in '{col}' ({len(col_fnds)} findings)",
                    description=(
                        f"Multiple distinct investigative findings were identified affecting column '{col}'. "
                        f"This cluster combines {len(col_fnds)} anomalies spanning observed deviations."
                    ),
                    columns=[col],
                    strength=strength,
                    direction="cluster",
                    significance=significance,
                    supporting_finding_ids=supporting_ids[:5],
                    metadata={"finding_count": len(col_fnds)},
                )
                cross_patterns.append(p)

        return cross_patterns

    def get_patterns(self, dataset_id: str) -> List[Pattern]:
        summary = self.analyze(dataset_id, force=False)
        return summary.patterns

    def get_relationships(self, dataset_id: str) -> List[Relationship]:
        summary = self.analyze(dataset_id, force=False)
        return summary.relationships

    def get_timeline(self, dataset_id: str) -> List[TimelineEvent]:
        summary = self.analyze(dataset_id, force=False)
        return summary.timeline


# Singleton instance
pattern_engine = PatternEngine()
