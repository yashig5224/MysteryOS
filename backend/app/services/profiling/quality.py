from typing import List
import pandas as pd
import numpy as np

from app.api.schemas.dataset import QualityScore, ColumnProfile


def calculate_data_quality(df: pd.DataFrame, columns: List[ColumnProfile]) -> QualityScore:
    """
    Evaluate dataset health and generate human-readable investigative observations.
    Calculates composite health score (0 - 100) and grade (A to F).
    """
    total_cells = len(df) * len(df.columns) if len(df.columns) > 0 else 1
    total_nulls = int(df.isna().sum().sum())
    missing_pct = round((total_nulls / total_cells) * 100, 2)

    duplicate_rows_count = int(df.duplicated().sum())
    duplicate_pct = round((duplicate_rows_count / len(df)) * 100, 2) if len(df) > 0 else 0.0

    # Constant / zero-variance columns (excluding single-row datasets)
    constant_cols = [col.name for col in columns if col.is_constant and len(df) > 1]
    constant_pct = round((len(constant_cols) / len(columns)) * 100, 2) if len(columns) > 0 else 0.0

    # Mixed or unparseable value penalty estimate
    invalid_pct = round(min(15.0, constant_pct * 0.5), 2)
    consistency_pct = round(max(0.0, 100.0 - invalid_pct - (missing_pct * 0.3)), 2)

    # Score components (out of 100)
    completeness_score = max(0.0, 100.0 - (missing_pct * 2.0))
    uniqueness_score = max(0.0, 100.0 - (duplicate_pct * 3.0))

    # Overall weighted health score
    raw_score = (
        (completeness_score * 0.45)
        + (uniqueness_score * 0.25)
        + (consistency_pct * 0.30)
    )
    overall_score = int(max(0, min(100, round(raw_score))))

    # Determine letter grade
    if overall_score >= 90:
        grade = "A"
    elif overall_score >= 80:
        grade = "B"
    elif overall_score >= 70:
        grade = "C"
    elif overall_score >= 60:
        grade = "D"
    else:
        grade = "F"

    # Generate Human-Readable Observations
    observations: List[str] = []

    # 1. Dataset Dimensions & Duplicates
    if duplicate_rows_count > 0:
        observations.append(
            f"Dataset contains {duplicate_rows_count} exact duplicate rows ({duplicate_pct}% of total records)."
        )
    else:
        observations.append("No duplicate rows detected across the entire dataset.")

    # 2. Missing Values Observations
    if missing_pct == 0:
        observations.append("Dataset is 100% complete with zero missing values.")
    else:
        high_missing_cols = [c for c in columns if c.null_percentage > 10.0]
        if high_missing_cols:
            col_list = ", ".join(f"'{c.name}' ({c.null_percentage}%)" for c in high_missing_cols[:3])
            observations.append(f"Significant missing values detected in: {col_list}.")
        else:
            observations.append(f"Overall missing value rate is low at {missing_pct}%.")

    # 3. Identifiers & Key Columns
    id_cols = [c for c in columns if c.is_likely_id]
    if id_cols:
        col_names = ", ".join(f"'{c.name}'" for c in id_cols[:3])
        observations.append(f"{col_names} appears to be a unique identifier or entity key.")

    # 4. Temporal / Date Columns
    temp_cols = [c for c in columns if c.is_temporal]
    if temp_cols:
        col_names = ", ".join(f"'{c.name}'" for c in temp_cols[:3])
        observations.append(f"{col_names} identified as temporal / chronological event series.")

    # 5. Constant or Low Variance Columns
    if constant_cols:
        col_names = ", ".join(f"'{c}'" for c in constant_cols[:3])
        observations.append(f"{col_names} contains identical constant values across all rows.")

    # 6. Numerical Insights
    for col in columns:
        if col.numeric_stats:
            if col.numeric_stats.zeros_count > (len(df) * 0.4) and len(df) > 5:
                observations.append(
                    f"Column '{col.name}' contains a high frequency of zeros ({col.numeric_stats.zeros_count} rows)."
                )

    return QualityScore(
        overall_score=overall_score,
        grade=grade,
        missing_percentage=missing_pct,
        duplicate_percentage=duplicate_pct,
        invalid_percentage=invalid_pct,
        consistency_percentage=consistency_pct,
        completeness_score=round(completeness_score, 2),
        uniqueness_score=round(uniqueness_score, 2),
        observations=observations,
    )
