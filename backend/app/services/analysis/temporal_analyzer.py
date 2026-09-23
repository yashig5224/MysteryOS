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


def detect_temporal_anomalies(
    df: pd.DataFrame,
    dataset_id: str,
    profile: Optional[DatasetProfile] = None,
) -> List[AnalysisFinding]:
    """
    Detect temporal anomalies, sudden spikes, drops, and trend shifts across datetime columns.
    Gracefully skips if no datetime column is present.
    """
    findings: List[AnalysisFinding] = []
    if df.empty:
        return findings

    temporal_cols = profile.temporal_columns if profile else []
    if not temporal_cols:
        return findings

    time_col = temporal_cols[0]
    id_cols = set(profile.likely_id_columns) if profile else set()

    # Identify numeric metrics to track over time
    metric_cols = [
        c for c in df.columns
        if c not in id_cols and c != time_col and pd.api.types.is_numeric_dtype(df[c])
    ]

    if not metric_cols:
        return findings

    try:
        # Create sorted copy by time
        temp_df = df.copy()
        temp_df["_parsed_dt"] = pd.to_datetime(temp_df[time_col], errors="coerce")
        temp_df = temp_df.dropna(subset=["_parsed_dt"]).sort_values("_parsed_dt")

        if len(temp_df) < 5:
            return findings

        for metric in metric_cols:
            series = pd.to_numeric(temp_df[metric], errors="coerce")
            if series.dropna().empty:
                continue

            # Compute percentage change and rolling statistics
            pct_change = series.pct_change()
            rolling_mean = series.rolling(window=min(5, len(series)), min_periods=1).mean()
            rolling_std = series.rolling(window=min(5, len(series)), min_periods=1).std().fillna(1.0)

            for idx_pos in range(1, len(temp_df)):
                chg = pct_change.iloc[idx_pos]
                curr_val = series.iloc[idx_pos]
                prev_val = series.iloc[idx_pos - 1]
                dt_val = temp_df["_parsed_dt"].iloc[idx_pos].strftime("%Y-%m-%d %H:%M:%S")
                orig_row_idx = temp_df.index[idx_pos]

                if pd.isna(chg) or np.isinf(chg) or pd.isna(curr_val) or pd.isna(prev_val):
                    continue

                abs_pct = chg * 100

                # Sudden spike detection (> +75% change and significant absolute magnitude)
                if abs_pct >= 75.0 and curr_val > prev_val:
                    score = normalize_score(55.0 + min(40.0, (abs_pct - 75.0) * 0.3))
                    severity = classify_severity(score)
                    findings.append(
                        AnalysisFinding(
                            finding_id=f"temp_spike_{uuid.uuid4().hex[:8]}",
                            dataset_id=dataset_id,
                            type=FindingType.TREND.value,
                            subtype=FindingSubtype.SUDDEN_INCREASE.value,
                            title=f"Sudden Metric Spike in '{metric}' (+{abs_pct:.1f}%)",
                            description=(
                                f"At timestamp {dt_val} (Row {orig_row_idx}), metric '{metric}' surged by "
                                f"+{abs_pct:.1f}% from previous period value of {prev_val:,.2f} to {curr_val:,.2f}."
                            ),
                            column=str(metric),
                            row_reference=int(orig_row_idx) if isinstance(orig_row_idx, (int, np.integer)) else str(orig_row_idx),
                            observed_value=round(float(curr_val), 2),
                            expected_value=round(float(prev_val), 2),
                            severity=severity,
                            score=score,
                            method="Temporal Differencing",
                            detected_by=["Temporal Differencing"],
                            confidence=0.90,
                            deviation_percentage=round(abs_pct, 2),
                            metadata={"timestamp": dt_val, "time_column": time_col, "previous_value": float(prev_val)},
                        )
                    )

                # Sudden drop detection (< -50% change)
                elif abs_pct <= -50.0 and curr_val < prev_val:
                    score = normalize_score(55.0 + min(40.0, (abs(abs_pct) - 50.0) * 0.4))
                    severity = classify_severity(score)
                    findings.append(
                        AnalysisFinding(
                            finding_id=f"temp_drop_{uuid.uuid4().hex[:8]}",
                            dataset_id=dataset_id,
                            type=FindingType.TREND.value,
                            subtype=FindingSubtype.SUDDEN_DECREASE.value,
                            title=f"Sudden Metric Drop in '{metric}' ({abs_pct:.1f}%)",
                            description=(
                                f"At timestamp {dt_val} (Row {orig_row_idx}), metric '{metric}' dropped by "
                                f"{abs_pct:.1f}% from previous period value of {prev_val:,.2f} to {curr_val:,.2f}."
                            ),
                            column=str(metric),
                            row_reference=int(orig_row_idx) if isinstance(orig_row_idx, (int, np.integer)) else str(orig_row_idx),
                            observed_value=round(float(curr_val), 2),
                            expected_value=round(float(prev_val), 2),
                            severity=severity,
                            score=score,
                            method="Temporal Differencing",
                            detected_by=["Temporal Differencing"],
                            confidence=0.90,
                            deviation_percentage=round(abs_pct, 2),
                            metadata={"timestamp": dt_val, "time_column": time_col, "previous_value": float(prev_val)},
                        )
                    )

    except Exception:
        pass

    return findings
