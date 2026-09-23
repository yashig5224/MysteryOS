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


def detect_categorical_anomalies(
    df: pd.DataFrame,
    dataset_id: str,
    profile: Optional[DatasetProfile] = None,
) -> List[AnalysisFinding]:
    """
    Detect rare category occurrences, extreme class dominance, and frequency anomalies.
    """
    findings: List[AnalysisFinding] = []
    if df.empty:
        return findings

    id_cols = set(profile.likely_id_columns) if profile else set()
    temporal_cols = set(profile.temporal_columns) if profile else set()

    for col in df.columns:
        if col in id_cols or col in temporal_cols:
            continue

        series = df[col].dropna()
        total_valid = len(series)
        if total_valid < 10:
            continue

        cardinality = int(series.nunique())
        # Only process true categorical variables (cardinality >= 2 and reasonable limit)
        if cardinality < 2 or cardinality > (total_valid * 0.7):
            continue

        val_counts = series.astype(str).value_counts()
        most_frequent_val = val_counts.index[0]
        most_frequent_count = int(val_counts.iloc[0])
        dominant_pct = (most_frequent_count / total_valid) * 100

        # 1. Unusually Dominant Category Check (>= 92% when cardinality >= 3)
        if dominant_pct >= 92.0 and cardinality >= 3:
            score = normalize_score(50.0 + min(35.0, (dominant_pct - 92.0) * 4.0))
            severity = classify_severity(score)
            findings.append(
                AnalysisFinding(
                    finding_id=f"cat_dom_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    type=FindingType.STATISTICAL.value,
                    subtype=FindingSubtype.CATEGORICAL_DOMINANT.value,
                    title=f"Dominant Category in '{col}' ({dominant_pct:.1f}%)",
                    description=(
                        f"Category '{most_frequent_val}' accounts for {dominant_pct:.1f}% ({most_frequent_count:,} rows) "
                        f"of all non-null values in column '{col}', exhibiting extreme distribution skew."
                    ),
                    column=str(col),
                    row_reference=None,
                    observed_value=f"{most_frequent_val} ({dominant_pct:.1f}%)",
                    expected_value=f"Balanced distribution across {cardinality} classes",
                    severity=severity,
                    score=score,
                    method="Frequency Analysis",
                    detected_by=["Frequency Analysis"],
                    confidence=0.88,
                    deviation_percentage=round(dominant_pct, 2),
                    metadata={"cardinality": cardinality, "dominant_value": most_frequent_val},
                )
            )

        # 2. Rare Categories Check (< 2.5% of observations in datasets with >= 25 rows)
        if total_valid >= 25 and cardinality >= 3:
            rare_threshold_count = max(1, int(total_valid * 0.025))
            rare_categories = val_counts[val_counts <= rare_threshold_count]

            for rare_val, count in rare_categories.items():
                rare_pct = round((count / total_valid) * 100, 2)
                # Skip if empty strings
                if str(rare_val).strip() == "":
                    continue

                # Find first row index featuring this rare category
                row_indices = df[df[col].astype(str) == str(rare_val)].index.tolist()
                first_row = row_indices[0] if row_indices else None

                score = normalize_score(55.0 + min(35.0, (3.0 - rare_pct) * 12.0))
                severity = classify_severity(score)

                findings.append(
                    AnalysisFinding(
                        finding_id=f"cat_rare_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        type=FindingType.ANOMALY.value,
                        subtype=FindingSubtype.CATEGORICAL_RARE.value,
                        title=f"Rare Category '{rare_val}' in '{col}' ({rare_pct}%)",
                        description=(
                            f"Category value '{rare_val}' occurs only {count} time(s) ({rare_pct}% of records) "
                            f"in column '{col}' (e.g. Row {first_row})."
                        ),
                        column=str(col),
                        row_reference=int(first_row) if isinstance(first_row, int) else (str(first_row) if first_row is not None else None),
                        observed_value=f"'{rare_val}' ({count} occurrences, {rare_pct}%)",
                        expected_value=f"> {rare_threshold_count} occurrences",
                        severity=severity,
                        score=score,
                        method="Frequency Analysis",
                        detected_by=["Frequency Analysis"],
                        confidence=0.85,
                        deviation_percentage=rare_pct,
                        metadata={"count": int(count), "total_rows": total_valid},
                    )
                )

    return findings
