import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
import pandas as pd

from app.api.schemas.analysis import (
    AnalysisSummary,
    AnalysisFinding,
    FindingType,
)
from app.services.ingestion.dataset_store import dataset_store
from app.services.analysis.anomaly_detector import detect_numerical_anomalies
from app.services.analysis.categorical_analyzer import detect_categorical_anomalies
from app.services.analysis.temporal_analyzer import detect_temporal_anomalies
from app.services.analysis.statistical_analyzer import detect_statistical_anomalies
from app.services.analysis.insight_generator import generate_data_insights
from app.services.analysis.scoring import deduplicate_and_merge_findings


class AnalysisEngine:
    """
    Central Data Mining and Automatic Anomaly Detection Orchestrator for MysteryOS.
    Executes multi-method statistical, numerical, categorical, and temporal analysis.
    """

    def __init__(self, processed_dir: Optional[Path] = None):
        if processed_dir:
            self.processed_dir = processed_dir
        else:
            self.processed_dir = dataset_store.processed_dir

        self.processed_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_path(self, dataset_id: str) -> Path:
        return self.processed_dir / f"analysis_{dataset_id}.json"

    def get_cached_analysis(self, dataset_id: str) -> Optional[AnalysisSummary]:
        """Retrieve cached analysis if available on disk."""
        cache_path = self._get_cache_path(dataset_id)
        if cache_path.exists():
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return AnalysisSummary(**data)
            except Exception:
                return None
        return None

    def save_analysis(self, summary: AnalysisSummary):
        """Save analysis summary to disk cache."""
        cache_path = self._get_cache_path(summary.dataset_id)
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(summary.model_dump(), f, indent=2)
        except Exception:
            pass

    def analyze(self, dataset_id: str, force: bool = False) -> AnalysisSummary:
        """
        Execute full data mining & anomaly detection pipeline on a dataset.
        Returns structured AnalysisSummary with deduplicated and ranked findings.
        """
        start_time = time.time()

        # Check cache if force is False
        if not force:
            cached = self.get_cached_analysis(dataset_id)
            if cached is not None:
                return cached

        # Load DataFrame and profile from dataset store
        df = dataset_store.get_dataset_df(dataset_id)
        if df is None:
            raise FileNotFoundError(f"Dataset '{dataset_id}' not found or could not be loaded.")

        profile = dataset_store.get_dataset_profile(dataset_id)

        if df.empty:
            empty_summary = AnalysisSummary(
                dataset_id=dataset_id,
                status="empty",
                total_findings=0,
                high_count=0,
                medium_count=0,
                low_count=0,
                analysis_methods=[],
                findings=[],
                analyzed_at=datetime.now(timezone.utc).isoformat(),
                duration_ms=round((time.time() - start_time) * 1000, 2),
            )
            self.save_analysis(empty_summary)
            return empty_summary

        raw_findings: List[AnalysisFinding] = []

        # 1. Numerical Anomaly Detection (IQR, Z-score, Isolation Forest)
        num_findings = detect_numerical_anomalies(df, dataset_id, profile)
        raw_findings.extend(num_findings)

        # 2. Categorical Anomaly Detection (Rare categories, dominance)
        cat_findings = detect_categorical_anomalies(df, dataset_id, profile)
        raw_findings.extend(cat_findings)

        # 3. Temporal Anomaly Detection (Spikes, drops, period shifts)
        temp_findings = detect_temporal_anomalies(df, dataset_id, profile)
        raw_findings.extend(temp_findings)

        # 4. Statistical Anomaly Detection (Dispersion, skewness)
        stat_findings = detect_statistical_anomalies(df, dataset_id, profile)
        raw_findings.extend(stat_findings)

        # 5. Deduplicate and merge overlapping findings
        deduped_findings = deduplicate_and_merge_findings(raw_findings)

        # 6. Generate Data Insights
        insights = generate_data_insights(df, dataset_id, deduped_findings, profile)
        all_findings = deduped_findings + insights

        # Severity breakdown
        high_cnt = sum(1 for f in all_findings if f.severity == "high")
        med_cnt = sum(1 for f in all_findings if f.severity == "medium")
        low_cnt = sum(1 for f in all_findings if f.severity == "low")

        # Collect distinct detection methods used
        methods_set = set()
        for f in all_findings:
            if f.detected_by:
                methods_set.update(f.detected_by)
            elif f.method:
                methods_set.add(f.method)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        summary = AnalysisSummary(
            dataset_id=dataset_id,
            status="completed",
            total_findings=len(all_findings),
            high_count=high_cnt,
            medium_count=med_cnt,
            low_count=low_cnt,
            analysis_methods=sorted(list(methods_set)),
            findings=all_findings,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=duration_ms,
        )

        # Save to disk cache
        self.save_analysis(summary)
        return summary

    def get_anomalies(self, dataset_id: str) -> List[AnalysisFinding]:
        """Return only anomaly-type findings for a dataset."""
        summary = self.analyze(dataset_id, force=False)
        return [f for f in summary.findings if f.type == FindingType.ANOMALY.value]

    def get_insights(self, dataset_id: str) -> List[AnalysisFinding]:
        """Return trend and statistical insights for a dataset."""
        summary = self.analyze(dataset_id, force=False)
        return [f for f in summary.findings if f.type in {FindingType.TREND.value, FindingType.STATISTICAL.value}]


# Global singleton instance
analysis_engine = AnalysisEngine()
