import uuid
from typing import List, Optional
import pandas as pd

from app.api.schemas.analysis import (
    AnalysisFinding,
    FindingType,
    FindingSubtype,
)
from app.api.schemas.dataset import DatasetProfile
from app.services.analysis.scoring import normalize_score, classify_severity


def generate_data_insights(
    df: pd.DataFrame,
    dataset_id: str,
    findings: List[AnalysisFinding],
    profile: Optional[DatasetProfile] = None,
) -> List[AnalysisFinding]:
    """
    Generate high-level data insights synthesizing detected anomalies and key dataset patterns.
    """
    insights: List[AnalysisFinding] = []
    if df.empty:
        return insights

    # 1. Strongest single outlier insight
    anomalies = [f for f in findings if f.type == FindingType.ANOMALY.value and f.score >= 70]
    if anomalies:
        top_anomaly = max(anomalies, key=lambda x: x.score)
        insights.append(
            AnalysisFinding(
                finding_id=f"ins_top_{uuid.uuid4().hex[:8]}",
                dataset_id=dataset_id,
                type=FindingType.STATISTICAL.value,
                subtype=FindingSubtype.SIGNIFICANT_CHANGE.value,
                title=f"Primary Anomaly Driver: '{top_anomaly.column}' (Score: {top_anomaly.score})",
                description=(
                    f"The strongest unusual pattern in this dataset was identified in column '{top_anomaly.column}' "
                    f"with anomaly score {top_anomaly.score}/100, confirmed by {top_anomaly.method}."
                ),
                column=top_anomaly.column,
                row_reference=top_anomaly.row_reference,
                observed_value=top_anomaly.observed_value,
                expected_value=top_anomaly.expected_value,
                severity=top_anomaly.severity,
                score=top_anomaly.score,
                method="Multi-Method Synthesis",
                detected_by=["Synthesis"],
                confidence=0.92,
                deviation_percentage=top_anomaly.deviation_percentage,
            )
        )

    # 2. Overall anomaly density insight
    if len(findings) > 0:
        high_count = sum(1 for f in findings if f.severity == "high")
        if high_count >= 3:
            insights.append(
                AnalysisFinding(
                    finding_id=f"ins_dense_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    type=FindingType.STATISTICAL.value,
                    subtype=FindingSubtype.HIGH_VARIANCE.value,
                    title=f"Multiple High-Severity Outliers ({high_count} detected)",
                    description=(
                        f"Analysis discovered {high_count} high-severity anomalies across the dataset, "
                        f"suggesting non-uniform distributions or multi-segment data behavior."
                    ),
                    column=None,
                    row_reference=None,
                    observed_value=f"{high_count} high-severity anomalies",
                    expected_value="< 2 high-severity outliers",
                    severity="high",
                    score=85,
                    method="Density Analysis",
                    detected_by=["Density Analysis"],
                    confidence=0.88,
                )
            )

    return insights
