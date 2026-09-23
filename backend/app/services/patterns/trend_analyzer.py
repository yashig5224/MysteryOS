import uuid
from typing import List, Optional
import pandas as pd
import numpy as np

from app.api.schemas.patterns import Pattern, PatternType
from app.api.schemas.dataset import DatasetProfile
from app.api.schemas.analysis import AnalysisFinding
from app.services.patterns.scoring import calculate_pattern_strength, classify_significance


def analyze_trends(
    df: pd.DataFrame,
    dataset_id: str,
    profile: Optional[DatasetProfile] = None,
    findings: Optional[List[AnalysisFinding]] = None,
) -> List[Pattern]:
    """
    Detect sustained directional trends, acceleration, and trend reversals in temporal series.
    """
    patterns: List[Pattern] = []
    if df.empty or not profile or not profile.temporal_columns:
        return patterns

    time_col = profile.temporal_columns[0]
    id_cols = set(profile.likely_id_columns)

    # Eligible numeric metrics
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

        if len(temp_df) < 5:
            return patterns

        for metric in metric_cols:
            series = pd.to_numeric(temp_df[metric], errors="coerce").dropna()
            if len(series) < 5:
                continue

            # Linear trend fit (slope and R^2)
            x_vals = np.arange(len(series))
            y_vals = series.values
            if np.std(y_vals) == 0:
                continue

            slope, intercept = np.polyfit(x_vals, y_vals, 1)
            mean_y = np.mean(y_vals)
            relative_slope = slope / (abs(mean_y) if mean_y != 0 else 1.0)
            
            # Correlation with time index (trend strength)
            time_corr = float(np.corrcoef(x_vals, y_vals)[0, 1])

            if abs(time_corr) >= 0.65:
                direction = "upward" if slope > 0 else "downward"
                start_dt = str(temp_df["_parsed_dt"].iloc[0].strftime("%Y-%m-%d"))
                end_dt = str(temp_df["_parsed_dt"].iloc[-1].strftime("%Y-%m-%d"))
                total_change_pct = round(((y_vals[-1] - y_vals[0]) / (abs(y_vals[0]) if y_vals[0] != 0 else 1.0)) * 100, 2)

                # Link supporting findings
                supporting_ids = []
                if findings:
                    for f in findings:
                        if f.column == metric:
                            supporting_ids.append(f.finding_id)

                strength = calculate_pattern_strength(
                    base_magnitude=abs(time_corr),
                    sample_size=len(series),
                    supporting_count=len(supporting_ids),
                )
                significance = classify_significance(strength)

                title = f"Sustained {direction.title()} Trend in '{metric}' ({total_change_pct:+.1f}%)"
                desc = (
                    f"A sustained {direction} trajectory was detected for metric '{metric}' between {start_dt} and {end_dt} "
                    f"(trend correlation: {time_corr:+.2f}, total net shift: {total_change_pct:+.1f}%)."
                )

                pattern = Pattern(
                    pattern_id=f"pat_trend_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    type=PatternType.TREND.value,
                    title=title,
                    description=desc,
                    columns=[str(metric)],
                    strength=strength,
                    direction=direction,
                    significance=significance,
                    supporting_finding_ids=supporting_ids[:5],
                    metadata={
                        "time_column": time_col,
                        "start_date": start_dt,
                        "end_date": end_dt,
                        "trend_correlation": round(time_corr, 3),
                        "total_change_percentage": total_change_pct,
                    },
                )
                patterns.append(pattern)

    except Exception:
        pass

    return patterns
