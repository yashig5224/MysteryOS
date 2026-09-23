import uuid
from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.api.schemas.analysis import (
    AnalysisFinding,
    FindingType,
    FindingSubtype,
    ExpectedRange,
)
from app.api.schemas.dataset import DatasetProfile
from app.services.analysis.scoring import normalize_score, classify_severity


def detect_numerical_anomalies(
    df: pd.DataFrame,
    dataset_id: str,
    profile: Optional[DatasetProfile] = None,
) -> List[AnalysisFinding]:
    """
    Detect numerical anomalies and statistical outliers using IQR, Z-score, and Isolation Forest.
    Applies smart column filtering (excludes IDs, non-numerics, constant values).
    """
    findings: List[AnalysisFinding] = []
    if df.empty:
        return findings

    # Identify excluded columns (IDs, constants, non-numerics)
    id_cols = set(profile.likely_id_columns) if profile else set()
    numeric_cols = []

    for col in df.columns:
        if col in id_cols:
            continue
        series = df[col]
        # Check if numeric
        if pd.api.types.is_numeric_dtype(series):
            # Check unique count / constant
            if series.nunique(dropna=True) > 1:
                numeric_cols.append(col)

    if not numeric_cols:
        return findings

    total_rows = len(df)

    # 1. IQR Method
    for col in numeric_cols:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 4:
            continue

        q1 = float(series.quantile(0.25))
        q3 = float(series.quantile(0.75))
        iqr = q3 - q1
        if iqr <= 0:
            continue

        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        median_val = float(series.median())

        for idx, val in series.items():
            val_float = float(val)
            if val_float < lower_bound or val_float > upper_bound:
                # Calculate distance beyond boundary
                distance = (lower_bound - val_float) if val_float < lower_bound else (val_float - upper_bound)
                deviation_pct = round(((val_float - median_val) / (abs(median_val) if median_val != 0 else 1.0)) * 100, 2)
                
                # Raw score based on IQR multiplier
                iqr_multiplier = distance / iqr
                score = normalize_score(50.0 + min(50.0, iqr_multiplier * 18.0))
                severity = classify_severity(score)

                direction = "above upper threshold" if val_float > upper_bound else "below lower threshold"
                title = f"Potential Outlier in '{col}' ({direction})"
                desc = (
                    f"Observed value of {val_float:,.2f} in column '{col}' (Row {idx}) is statistically unusual "
                    f"and falls outside the expected IQR boundary [{lower_bound:,.2f}, {upper_bound:,.2f}]."
                )

                findings.append(
                    AnalysisFinding(
                        finding_id=f"iqr_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        type=FindingType.ANOMALY.value,
                        subtype=FindingSubtype.NUMERIC_OUTLIER.value,
                        title=title,
                        description=desc,
                        column=str(col),
                        row_reference=int(idx) if isinstance(idx, (int, np.integer)) else str(idx),
                        observed_value=val_float,
                        expected_value=round(median_val, 2),
                        expected_range=ExpectedRange(lower=round(lower_bound, 2), upper=round(upper_bound, 2)),
                        severity=severity,
                        score=score,
                        method="IQR",
                        detected_by=["IQR"],
                        confidence=0.85,
                        deviation_percentage=deviation_pct,
                    )
                )

    # 2. Z-Score Method
    for col in numeric_cols:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 5:
            continue

        mean_val = float(series.mean())
        std_val = float(series.std())
        if std_val <= 0 or np.isnan(std_val):
            continue

        z_scores = (series - mean_val) / std_val

        for idx, z in z_scores.items():
            z_float = float(z)
            if abs(z_float) >= 2.8:  # 2.8+ standard deviations
                val_float = float(series[idx])
                deviation_pct = round(((val_float - mean_val) / (abs(mean_val) if mean_val != 0 else 1.0)) * 100, 2)
                score = normalize_score(55.0 + min(45.0, (abs(z_float) - 2.8) * 15.0))
                severity = classify_severity(score)

                expected_min = mean_val - 2.5 * std_val
                expected_max = mean_val + 2.5 * std_val

                title = f"Extreme Z-Score in '{col}' (|z| = {abs(z_float):.2f})"
                desc = (
                    f"Observed value of {val_float:,.2f} in column '{col}' (Row {idx}) deviates by "
                    f"{abs(z_float):.2f} standard deviations from the dataset mean ({mean_val:,.2f})."
                )

                findings.append(
                    AnalysisFinding(
                        finding_id=f"z_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        type=FindingType.ANOMALY.value,
                        subtype=FindingSubtype.STATISTICAL_OUTLIER.value,
                        title=title,
                        description=desc,
                        column=str(col),
                        row_reference=int(idx) if isinstance(idx, (int, np.integer)) else str(idx),
                        observed_value=val_float,
                        expected_value=round(mean_val, 2),
                        expected_range=ExpectedRange(lower=round(expected_min, 2), upper=round(expected_max, 2)),
                        severity=severity,
                        score=score,
                        method="Z-score",
                        detected_by=["Z-score"],
                        confidence=0.88,
                        deviation_percentage=deviation_pct,
                    )
                )

    # 3. Isolation Forest (Multivariate / Multi-column when sufficient data)
    if total_rows >= 15 and len(numeric_cols) >= 1:
        try:
            clean_numeric_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce").fillna(df[numeric_cols].median())
            # Fit Isolation Forest
            iso_forest = IsolationForest(
                contamination=min(0.08, max(0.01, 3.0 / total_rows)),
                random_state=42,
                n_estimators=50,
            )
            preds = iso_forest.fit_predict(clean_numeric_df)
            decision_scores = iso_forest.decision_function(clean_numeric_df)

            anomalous_indices = np.where(preds == -1)[0]
            for row_pos in anomalous_indices:
                raw_score = float(-decision_scores[row_pos])  # higher means more anomalous
                score = normalize_score(60.0 + min(40.0, raw_score * 120.0))
                severity = classify_severity(score)
                idx = df.index[row_pos]

                # Find dominant contributing column for this row
                row_vals = clean_numeric_df.iloc[row_pos]
                col_deviations = (row_vals - clean_numeric_df.mean()).abs() / (clean_numeric_df.std().replace(0, 1))
                top_col = str(col_deviations.idxmax())
                top_val = float(row_vals[top_col])

                title = f"Multivariate Isolation Anomaly (Row {idx})"
                desc = (
                    f"Row {idx} exhibits an anomalous multi-feature signature detected by Isolation Forest, "
                    f"with column '{top_col}' (value: {top_val:,.2f}) displaying the highest relative deviation."
                )

                findings.append(
                    AnalysisFinding(
                        finding_id=f"iso_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        type=FindingType.ANOMALY.value,
                        subtype=FindingSubtype.NUMERIC_OUTLIER.value,
                        title=title,
                        description=desc,
                        column=top_col,
                        row_reference=int(idx) if isinstance(idx, (int, np.integer)) else str(idx),
                        observed_value=top_val,
                        expected_value=round(float(clean_numeric_df[top_col].median()), 2),
                        expected_range=None,
                        severity=severity,
                        score=score,
                        method="Isolation Forest",
                        detected_by=["Isolation Forest"],
                        confidence=0.82,
                        deviation_percentage=None,
                    )
                )
        except Exception:
            pass

    return findings
