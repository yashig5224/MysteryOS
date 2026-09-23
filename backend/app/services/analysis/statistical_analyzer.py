import uuid
from typing import List, Optional
import pandas as pd
import numpy as np

from app.api.schemas.analysis import (
    AnalysisFinding,
    FindingType,
    FindingSubtype,
)
from app.api.schemas.dataset import DatasetProfile
from app.services.analysis.scoring import normalize_score, classify_severity


def detect_statistical_anomalies(
    df: pd.DataFrame,
    dataset_id: str,
    profile: Optional[DatasetProfile] = None,
) -> List[AnalysisFinding]:
    """
    Detect columns with extreme dispersion, high variance, or heavy skewness.
    """
    findings: List[AnalysisFinding] = []
    if df.empty:
        return findings

    id_cols = set(profile.likely_id_columns) if profile else set()

    for col in df.columns:
        if col in id_cols:
            continue

        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 8:
            continue

        mean_val = float(series.mean())
        std_val = float(series.std())
        median_val = float(series.median())

        if std_val <= 0 or np.isnan(std_val) or np.isnan(mean_val):
            continue

        # 1. High Coefficient of Variation (CV = std / |mean|)
        if abs(mean_val) > 1e-4:
            cv = std_val / abs(mean_val)
            if cv >= 2.5:  # high dispersion
                score = normalize_score(50.0 + min(35.0, (cv - 2.5) * 8.0))
                severity = classify_severity(score)
                findings.append(
                    AnalysisFinding(
                        finding_id=f"stat_var_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        type=FindingType.STATISTICAL.value,
                        subtype=FindingSubtype.HIGH_VARIANCE.value,
                        title=f"High Statistical Dispersion in '{col}' (CV = {cv:.2f})",
                        description=(
                            f"Column '{col}' shows exceptional relative volatility with standard deviation ({std_val:,.2f}) "
                            f"exceeding {cv:.1f}x the mean ({mean_val:,.2f})."
                        ),
                        column=str(col),
                        row_reference=None,
                        observed_value=round(cv, 2),
                        expected_value="CV < 1.0 (typical dispersion)",
                        severity=severity,
                        score=score,
                        method="Variance Analysis",
                        detected_by=["Variance Analysis"],
                        confidence=0.86,
                        deviation_percentage=round(cv * 100, 2),
                        metadata={"mean": round(mean_val, 2), "std": round(std_val, 2), "cv": round(cv, 2)},
                    )
                )

        # 2. Skewness / Mean vs Median Disparity
        if abs(median_val) > 1e-4 and abs(mean_val) > 1e-4:
            skew_ratio = abs(mean_val - median_val) / abs(median_val)
            if skew_ratio >= 1.5 and len(series) >= 20:
                score = normalize_score(50.0 + min(30.0, (skew_ratio - 1.5) * 10.0))
                severity = classify_severity(score)
                findings.append(
                    AnalysisFinding(
                        finding_id=f"stat_skew_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        type=FindingType.STATISTICAL.value,
                        subtype=FindingSubtype.SIGNIFICANT_CHANGE.value,
                        title=f"Severe Distribution Asymmetry in '{col}'",
                        description=(
                            f"Mean ({mean_val:,.2f}) deviates by {skew_ratio * 100:.1f}% from median ({median_val:,.2f}) "
                            f"in column '{col}', indicating heavily skewed tail values."
                        ),
                        column=str(col),
                        row_reference=None,
                        observed_value=round(mean_val, 2),
                        expected_value=round(median_val, 2),
                        severity=severity,
                        score=score,
                        method="Distribution Analysis",
                        detected_by=["Distribution Analysis"],
                        confidence=0.84,
                        deviation_percentage=round(skew_ratio * 100, 2),
                        metadata={"mean": round(mean_val, 2), "median": round(median_val, 2)},
                    )
                )

    return findings
