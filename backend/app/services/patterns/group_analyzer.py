import uuid
from typing import List, Optional
import pandas as pd
import numpy as np

from app.api.schemas.patterns import Pattern, PatternType
from app.api.schemas.dataset import DatasetProfile
from app.api.schemas.analysis import AnalysisFinding
from app.services.patterns.scoring import calculate_pattern_strength, classify_significance


def analyze_group_differences(
    df: pd.DataFrame,
    dataset_id: str,
    profile: Optional[DatasetProfile] = None,
    findings: Optional[List[AnalysisFinding]] = None,
) -> List[Pattern]:
    """
    Compare numerical metrics across categorical groups to discover significant disparities and segmental patterns.
    """
    patterns: List[Pattern] = []
    if df.empty or len(df) < 10:
        return patterns

    id_cols = set(profile.likely_id_columns) if profile else set()
    temporal_cols = set(profile.temporal_columns) if profile else set()

    cat_cols = []
    num_cols = []

    for col in df.columns:
        if col in id_cols or col in temporal_cols:
            continue
        series = df[col]
        if pd.api.types.is_numeric_dtype(series) and series.nunique(dropna=True) > 1:
            num_cols.append(col)
        elif not pd.api.types.is_numeric_dtype(series):
            nunique = series.nunique(dropna=True)
            if 2 <= nunique <= 20:  # reasonable categorical cardinality
                cat_cols.append(col)

    if not cat_cols or not num_cols:
        return patterns

    for cat_col in cat_cols[:4]:
        for num_col in num_cols[:4]:
            sub_df = df[[cat_col, num_col]].dropna()
            if len(sub_df) < 10:
                continue

            sub_df[num_col] = pd.to_numeric(sub_df[num_col], errors="coerce")
            sub_df = sub_df.dropna()

            group_stats = sub_df.groupby(cat_col)[num_col].agg(["mean", "count"]).dropna()
            # Only consider groups with at least 2 records
            valid_groups = group_stats[group_stats["count"] >= 2]
            if len(valid_groups) < 2:
                continue

            highest_group = valid_groups["mean"].idxmax()
            lowest_group = valid_groups["mean"].idxmin()
            highest_mean = float(valid_groups.loc[highest_group, "mean"])
            lowest_mean = float(valid_groups.loc[lowest_group, "mean"])

            if lowest_mean <= 0 and highest_mean <= 0:
                continue

            # Calculate relative difference
            baseline = abs(lowest_mean) if lowest_mean != 0 else 1.0
            disparity_pct = ((highest_mean - lowest_mean) / baseline) * 100

            # Only flag significant group disparities (> 45% difference)
            if disparity_pct >= 45.0:
                # Link supporting findings
                supporting_ids = []
                if findings:
                    for f in findings:
                        if f.column in {cat_col, num_col}:
                            supporting_ids.append(f.finding_id)

                norm_mag = min(1.0, disparity_pct / 200.0)
                strength = calculate_pattern_strength(
                    base_magnitude=norm_mag,
                    sample_size=len(sub_df),
                    supporting_count=len(supporting_ids),
                )
                significance = classify_significance(strength)

                title = f"Significant Segment Disparity in '{num_col}' by '{cat_col}' ({disparity_pct:.1f}% gap)"
                desc = (
                    f"A large performance difference was observed across '{cat_col}' segments for metric '{num_col}'. "
                    f"'{highest_group}' averaged {highest_mean:,.2f}, compared to {lowest_mean:,.2f} for '{lowest_group}' "
                    f"(a {disparity_pct:.1f}% disparity)."
                )

                pattern = Pattern(
                    pattern_id=f"pat_grp_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    type=PatternType.GROUP_DIFFERENCE.value,
                    title=title,
                    description=desc,
                    columns=[str(cat_col), str(num_col)],
                    strength=strength,
                    direction="disparity",
                    significance=significance,
                    supporting_finding_ids=supporting_ids[:5],
                    metadata={
                        "category_column": cat_col,
                        "metric_column": num_col,
                        "highest_group": str(highest_group),
                        "highest_mean": round(highest_mean, 2),
                        "lowest_group": str(lowest_group),
                        "lowest_mean": round(lowest_mean, 2),
                        "disparity_percentage": round(disparity_pct, 2),
                    },
                )
                patterns.append(pattern)

    patterns.sort(key=lambda x: x.strength, reverse=True)
    return patterns
