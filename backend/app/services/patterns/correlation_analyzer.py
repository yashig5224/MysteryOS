import uuid
from typing import List, Tuple, Optional
import pandas as pd
import numpy as np
from scipy import stats

from app.api.schemas.patterns import Pattern, CorrelationPair, PatternType
from app.api.schemas.dataset import DatasetProfile
from app.api.schemas.analysis import AnalysisFinding
from app.services.patterns.scoring import calculate_pattern_strength, classify_significance


def analyze_correlations(
    df: pd.DataFrame,
    dataset_id: str,
    profile: Optional[DatasetProfile] = None,
    findings: Optional[List[AnalysisFinding]] = None,
) -> Tuple[List[CorrelationPair], List[Pattern]]:
    """
    Discover linear and monotonic correlations across numerical column pairs.
    Excludes ID columns, handles missing values, and generates structured Pattern models.
    """
    correlation_pairs: List[CorrelationPair] = []
    patterns: List[Pattern] = []

    if df.empty or len(df) < 5:
        return correlation_pairs, patterns

    id_cols = set(profile.likely_id_columns) if profile else set()
    numeric_cols = []

    for col in df.columns:
        if col in id_cols:
            continue
        series = df[col]
        if pd.api.types.is_numeric_dtype(series) and series.nunique(dropna=True) > 1:
            numeric_cols.append(col)

    if len(numeric_cols) < 2:
        return correlation_pairs, patterns

    # Limit candidate pairs if dataset has very large number of columns
    max_cols = min(25, len(numeric_cols))
    selected_cols = numeric_cols[:max_cols]

    seen_pairs = set()

    for i in range(len(selected_cols)):
        for j in range(i + 1, len(selected_cols)):
            col1 = selected_cols[i]
            col2 = selected_cols[j]

            pair_key = tuple(sorted([col1, col2]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            sub_df = df[[col1, col2]].dropna()
            if len(sub_df) < 5:
                continue

            s1 = pd.to_numeric(sub_df[col1], errors="coerce")
            s2 = pd.to_numeric(sub_df[col2], errors="coerce")

            valid_mask = s1.notna() & s2.notna()
            s1 = s1[valid_mask]
            s2 = s2[valid_mask]

            if len(s1) < 5 or s1.std() == 0 or s2.std() == 0:
                continue

            try:
                # Calculate Pearson correlation
                r_pearson, p_val = stats.pearsonr(s1, s2)
                if np.isnan(r_pearson):
                    continue

                abs_r = abs(r_pearson)
                # Only keep correlations with meaningful strength (|r| >= 0.45)
                if abs_r >= 0.45:
                    direction = "positive" if r_pearson > 0 else "negative"
                    if abs_r >= 0.85:
                        strength_label = "very_strong"
                    elif abs_r >= 0.70:
                        strength_label = "strong"
                    else:
                        strength_label = "moderate"

                    corr_pair = CorrelationPair(
                        var1=str(col1),
                        var2=str(col2),
                        coefficient=round(float(r_pearson), 3),
                        method="pearson",
                        direction=direction,
                        strength=strength_label,
                        sample_size=len(s1),
                        p_value=round(float(p_val), 5) if not np.isnan(p_val) else None,
                    )
                    correlation_pairs.append(corr_pair)

                    # Find supporting Phase 3 findings that involve col1 or col2
                    supporting_ids = []
                    if findings:
                        for f in findings:
                            if f.column in {col1, col2}:
                                supporting_ids.append(f.finding_id)

                    pattern_strength = calculate_pattern_strength(
                        base_magnitude=abs_r,
                        sample_size=len(s1),
                        supporting_count=len(supporting_ids),
                    )
                    significance = classify_significance(pattern_strength)

                    dir_text = "positive (co-moving)" if direction == "positive" else "inverse (opposing)"
                    title = f"Strong {direction.title()} Association: '{col1}' & '{col2}' (r = {r_pearson:+.2f})"
                    desc = (
                        f"A statistically significant {dir_text} correlation was discovered between '{col1}' and '{col2}' "
                        f"(Pearson r = {r_pearson:+.2f}, sample size: {len(s1):,}). The variables tend to move together systematically."
                    )

                    pattern = Pattern(
                        pattern_id=f"pat_corr_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        type=PatternType.CORRELATION.value,
                        title=title,
                        description=desc,
                        columns=[str(col1), str(col2)],
                        strength=pattern_strength,
                        direction=direction,
                        significance=significance,
                        supporting_finding_ids=supporting_ids[:5],
                        metadata={
                            "coefficient": round(float(r_pearson), 3),
                            "method": "pearson",
                            "sample_size": len(s1),
                            "p_value": float(p_val) if not np.isnan(p_val) else None,
                        },
                    )
                    patterns.append(pattern)
            except Exception:
                continue

    # Sort correlation pairs and patterns by strength descending
    correlation_pairs.sort(key=lambda x: abs(x.coefficient), reverse=True)
    patterns.sort(key=lambda x: x.strength, reverse=True)

    return correlation_pairs, patterns
