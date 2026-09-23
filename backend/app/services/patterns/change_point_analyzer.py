import uuid
from typing import List, Optional
import pandas as pd
import numpy as np

from app.api.schemas.patterns import Pattern, PatternType
from app.api.schemas.dataset import DatasetProfile
from app.api.schemas.analysis import AnalysisFinding
from app.services.patterns.scoring import calculate_pattern_strength, classify_significance


def analyze_change_points(
    df: pd.DataFrame,
    dataset_id: str,
    profile: Optional[DatasetProfile] = None,
    findings: Optional[List[AnalysisFinding]] = None,
) -> List[Pattern]:
    """
    Detect structural change points where a time-series metric exhibits a significant step shift in mean.
    """
    patterns: List[Pattern] = []
    if df.empty or not profile or not profile.temporal_columns:
        return patterns

    time_col = profile.temporal_columns[0]
    id_cols = set(profile.likely_id_columns)

    metric_cols = [
        c for c in df.columns
        if c not in id_cols and c != time_col and pd.api.types.is_numeric_dtype(df[c])
    ]

    if not metric_cols:
        return patterns

    try:
        temp_df = df.copy()
        temp_df["_parsed_dt"] = pd.to_datetime(temp_df[time_col], errors="coerce")
        temp_df = temp_df.dropna(subset=["_parsed_dt"]).sort_values("_parsed_dt")

        if len(temp_df) < 8:
            return patterns

        n = len(temp_df)

        for metric in metric_cols:
            series = pd.to_numeric(temp_df[metric], errors="coerce").dropna()
            if len(series) < 8:
                continue

            values = series.values
            overall_std = np.std(values)
            if overall_std == 0:
                continue

            max_diff = 0.0
            best_split_idx = -1
            best_before_mean = 0.0
            best_after_mean = 0.0

            # Scan potential split points between 25% and 75% of timeline
            min_idx = max(3, int(n * 0.25))
            max_idx = min(n - 3, int(n * 0.75))

            for split_idx in range(min_idx, max_idx + 1):
                before_mean = float(np.mean(values[:split_idx]))
                after_mean = float(np.mean(values[split_idx:]))
                mean_diff = abs(after_mean - before_mean)

                if mean_diff > max_diff:
                    max_diff = mean_diff
                    best_split_idx = split_idx
                    best_before_mean = before_mean
                    best_after_mean = after_mean

            if best_split_idx > 0 and abs(best_before_mean) > 1e-4:
                shift_pct = ((best_after_mean - best_before_mean) / abs(best_before_mean)) * 100
                z_shift = max_diff / overall_std

                # If the shift is at least 1.5 standard deviations or > 30% relative shift
                if z_shift >= 1.5 and abs(shift_pct) >= 30.0:
                    split_date = str(temp_df["_parsed_dt"].iloc[best_split_idx].strftime("%Y-%m-%d %H:%M:%S"))
                    direction = "increase" if shift_pct > 0 else "decrease"

                    # Link supporting findings
                    supporting_ids = []
                    if findings:
                        for f in findings:
                            if f.column == metric:
                                supporting_ids.append(f.finding_id)

                    strength = calculate_pattern_strength(
                        base_magnitude=min(1.0, z_shift / 3.0),
                        sample_size=n,
                        supporting_count=len(supporting_ids),
                    )
                    significance = classify_significance(strength)

                    title = f"Structural Shift in '{metric}' around {split_date[:10]} ({shift_pct:+.1f}%)"
                    desc = (
                        f"A structural change point was identified at {split_date}. Prior to this point, "
                        f"'{metric}' averaged {best_before_mean:,.2f}, shifting to {best_after_mean:,.2f} thereafter "
                        f"({shift_pct:+.1f}% baseline transition)."
                    )

                    pattern = Pattern(
                        pattern_id=f"pat_cp_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        type=PatternType.CHANGE_POINT.value,
                        title=title,
                        description=desc,
                        columns=[str(metric)],
                        strength=strength,
                        direction=direction,
                        significance=significance,
                        supporting_finding_ids=supporting_ids[:5],
                        metadata={
                            "time_column": time_col,
                            "change_point_date": split_date,
                            "before_mean": round(best_before_mean, 2),
                            "after_mean": round(best_after_mean, 2),
                            "shift_percentage": round(shift_pct, 2),
                            "z_score_shift": round(z_shift, 2),
                        },
                    )
                    patterns.append(pattern)

    except Exception:
        pass

    return patterns
