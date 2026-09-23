import uuid
from typing import List, Optional
import pandas as pd
import numpy as np

from app.api.schemas.evidence import Evidence, EvidenceType, EvidencePolarity
from app.api.schemas.patterns import Pattern, Relationship
from app.api.schemas.analysis import AnalysisFinding
from app.services.evidence.evidence_scorer import calculate_evidence_strength


def detect_contradictory_evidence(
    df: pd.DataFrame,
    dataset_id: str,
    patterns: List[Pattern],
    findings: List[AnalysisFinding],
) -> List[Evidence]:
    """
    Deterministically surface contradictory empirical evidence that opposes, qualifies, or limits primary patterns.
    """
    contradictory_evidence: List[Evidence] = []
    if df.empty:
        return contradictory_evidence

    # Identify potential categorical and datetime columns in df
    date_cols = [
        c for c in df.columns
        if pd.api.types.is_datetime64_any_dtype(df[c]) or "date" in c.lower() or "time" in c.lower() or "timestamp" in c.lower()
    ]
    cat_cols = [
        c for c in df.columns
        if (
            pd.api.types.is_string_dtype(df[c])
            or pd.api.types.is_object_dtype(df[c])
            or str(df[c].dtype).startswith("category")
            or not pd.api.types.is_numeric_dtype(df[c])
        )
        and c not in date_cols
    ]

    for pat in patterns:
        # 1. Group Difference Contradiction: Check intermediate invariant groups
        if pat.type == "group_difference" and "category_column" in pat.metadata:
            cat_col = pat.metadata["category_column"]
            metric_col = pat.metadata.get("metric_column")
            lowest_grp = pat.metadata.get("lowest_group")
            highest_grp = pat.metadata.get("highest_group")

            if cat_col in df.columns and metric_col in df.columns:
                try:
                    grp_counts = df[cat_col].value_counts()
                    other_grps = [g for g in grp_counts.index if g not in {highest_grp, lowest_grp}]
                    if other_grps:
                        other_df = df[df[cat_col].isin(other_grps)]
                        other_mean = float(pd.to_numeric(other_df[metric_col], errors="coerce").mean())

                        strength = calculate_evidence_strength(
                            base_magnitude=0.60,
                            sample_size=len(other_df),
                            signal_count=1,
                        )

                        evd = Evidence(
                            evidence_id=f"evd_contra_{uuid.uuid4().hex[:8]}",
                            dataset_id=dataset_id,
                            title=f"Segmental Invariance in Alternative '{cat_col}' Groups",
                            description=(
                                f"While '{highest_grp}' and '{lowest_grp}' exhibit extreme differences in '{metric_col}', "
                                f"alternative segments ({', '.join(str(g) for g in other_grps[:3])}) maintain an intermediate baseline mean of {other_mean:,.2f}, "
                                f"indicating the pattern is localized rather than universal."
                            ),
                            evidence_type=EvidenceType.GROUP_DIFFERENCE_EVIDENCE.value,
                            strength=strength,
                            polarity=EvidencePolarity.CONTRADICT.value,
                            supports_pattern_ids=[pat.pattern_id],
                            related_finding_ids=pat.supporting_finding_ids,
                            columns=[str(cat_col), str(metric_col)],
                            source_metadata={"intermediate_groups": [str(g) for g in other_grps[:3]], "intermediate_mean": round(other_mean, 2)},
                        )
                        contradictory_evidence.append(evd)
                except Exception:
                    pass

        # 2. Change Point / Shift Contradictions
        elif pat.type == "change_point":
            metric_col = pat.metadata.get("shifted_column") or (pat.columns[0] if pat.columns else None)
            time_col = pat.metadata.get("time_column") or (date_cols[0] if date_cols else None)

            if metric_col and metric_col in df.columns:
                # Sub-case A: Check if a categorical sub-segment remained completely stable despite overall shift
                if cat_cols and time_col and time_col in df.columns:
                    for cat_col in cat_cols[:2]:
                        try:
                            # Group by category and check variance across time
                            unique_cats = df[cat_col].dropna().unique()
                            if len(unique_cats) >= 2:
                                for u_cat in unique_cats[:4]:
                                    sub_df = df[df[cat_col] == u_cat].copy()
                                    if len(sub_df) >= 6:
                                        sub_num = pd.to_numeric(sub_df[metric_col], errors="coerce").dropna()
                                        if len(sub_num) >= 6:
                                            mid = len(sub_num) // 2
                                            first_half = sub_num.iloc[:mid].mean()
                                            second_half = sub_num.iloc[mid:].mean()
                                            sub_pct = abs((second_half - first_half) / first_half) * 100 if first_half != 0 else 0

                                            if sub_pct < 12.0:  # Stable sub-segment!
                                                strength = calculate_evidence_strength(
                                                    base_magnitude=0.65,
                                                    sample_size=len(sub_df),
                                                    signal_count=1,
                                                )
                                                evd = Evidence(
                                                    evidence_id=f"evd_contra_{uuid.uuid4().hex[:8]}",
                                                    dataset_id=dataset_id,
                                                    title=f"Subgroup Stability: Segment '{u_cat}' Unaffected by '{metric_col}' Shift",
                                                    description=(
                                                        f"While '{metric_col}' underwent a structural shift across the dataset, "
                                                        f"the sub-cohort where '{cat_col}' = '{u_cat}' showed stability (change of only {sub_pct:.1f}%), "
                                                        f"contradicting a system-wide or global phenomenon."
                                                    ),
                                                    evidence_type=EvidenceType.CHANGE_POINT_EVIDENCE.value,
                                                    strength=strength,
                                                    polarity=EvidencePolarity.CONTRADICT.value,
                                                    supports_pattern_ids=[pat.pattern_id],
                                                    related_finding_ids=[],
                                                    columns=[str(cat_col), str(metric_col)],
                                                    source_metadata={"stable_segment": str(u_cat), "category_column": str(cat_col), "shift_percentage": round(sub_pct, 2)},
                                                )
                                                contradictory_evidence.append(evd)
                        except Exception:
                            pass

                # Sub-case B: Parallel Metric Stability across Transition Date
                if time_col and time_col in df.columns:
                    try:
                        other_nums = [
                            c for c in df.columns
                            if c != metric_col and c != time_col and pd.api.types.is_numeric_dtype(df[c])
                        ]
                        split_date = pat.metadata.get("change_point_date")
                        for other_col in other_nums[:2]:
                            temp_df = df.dropna(subset=[time_col, other_col]).copy()
                            temp_df["_dt"] = pd.to_datetime(temp_df[time_col], errors="coerce")

                            if split_date:
                                split_dt = pd.to_datetime(split_date, errors="coerce")
                                before_s = temp_df[temp_df["_dt"] < split_dt][other_col]
                                after_s = temp_df[temp_df["_dt"] >= split_dt][other_col]
                            else:
                                mid = len(temp_df) // 2
                                before_s = temp_df.iloc[:mid][other_col]
                                after_s = temp_df.iloc[mid:][other_col]

                            if len(before_s) >= 3 and len(after_s) >= 3:
                                b_mean = before_s.mean()
                                a_mean = after_s.mean()
                                shift_pct = abs((a_mean - b_mean) / b_mean) * 100 if b_mean != 0 else 0

                                if shift_pct < 10.0:  # Remained stable
                                    strength = calculate_evidence_strength(
                                        base_magnitude=0.55,
                                        sample_size=len(temp_df),
                                    )
                                    date_label = str(split_date)[:10] if split_date else "transition window"
                                    evd = Evidence(
                                        evidence_id=f"evd_contra_{uuid.uuid4().hex[:8]}",
                                        dataset_id=dataset_id,
                                        title=f"Parallel Metric Stability in '{other_col}' across {date_label}",
                                        description=(
                                            f"While '{metric_col}' underwent a structural shift, "
                                            f"companion metric '{other_col}' remained virtually stable (shift < {shift_pct:.1f}%), "
                                            f"suggesting the disturbance did not impact all system dimensions."
                                        ),
                                        evidence_type=EvidenceType.CHANGE_POINT_EVIDENCE.value,
                                        strength=strength,
                                        polarity=EvidencePolarity.CONTRADICT.value,
                                        supports_pattern_ids=[pat.pattern_id],
                                        related_finding_ids=[],
                                        columns=[str(other_col), str(metric_col)],
                                        source_metadata={"stable_metric": other_col, "shift_percentage": round(shift_pct, 2)},
                                    )
                                    contradictory_evidence.append(evd)
                    except Exception:
                        pass

    return contradictory_evidence
