from typing import Dict, Any, List
import pandas as pd

from app.api.schemas.dataset import DatasetProfile, ColumnProfile
from app.services.profiling.schema_detector import infer_column_type
from app.services.profiling.statistics import calculate_numeric_stats, calculate_categorical_stats
from app.services.profiling.quality import calculate_data_quality


def profile_dataset(df: pd.DataFrame, dataset_id: str = "") -> DatasetProfile:
    """
    Perform deep statistical and semantic profiling on a pandas DataFrame.
    Returns comprehensive DatasetProfile with column stats, roles, and quality scoring.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    duplicate_rows = int(df.duplicated().sum()) if total_rows > 0 else 0
    duplicate_pct = round((duplicate_rows / total_rows) * 100, 2) if total_rows > 0 else 0.0

    columns_profile: List[ColumnProfile] = []
    likely_id_cols: List[str] = []
    temporal_cols: List[str] = []
    numeric_cols: List[str] = []
    categorical_cols: List[str] = []

    for col in df.columns:
        series = df[col]
        null_count = int(series.isna().sum())
        null_pct = round((null_count / total_rows) * 100, 2) if total_rows > 0 else 0.0
        unique_count = int(series.nunique(dropna=True))
        unique_pct = round((unique_count / total_rows) * 100, 2) if total_rows > 0 else 0.0
        is_constant = bool(unique_count <= 1 and total_rows > 1)

        inferred_type, is_id, is_temp = infer_column_type(series, col)

        if is_id:
            likely_id_cols.append(str(col))
        if is_temp:
            temporal_cols.append(str(col))
        if inferred_type == "numeric":
            numeric_cols.append(str(col))
        elif inferred_type == "categorical":
            categorical_cols.append(str(col))

        # Calculate specific statistics based on type
        num_stats = calculate_numeric_stats(series) if inferred_type in {"numeric", "id"} else None
        cat_stats = (
            calculate_categorical_stats(series)
            if inferred_type in {"categorical", "text", "boolean", "id"} or (unique_count <= 20 and total_rows > 0)
            else None
        )

        col_prof = ColumnProfile(
            name=str(col),
            dtype=str(series.dtype),
            inferred_type=inferred_type,
            total_count=total_rows,
            null_count=null_count,
            null_percentage=null_pct,
            unique_count=unique_count,
            unique_percentage=unique_pct,
            is_likely_id=is_id,
            is_temporal=is_temp,
            is_constant=is_constant,
            numeric_stats=num_stats,
            categorical_stats=cat_stats,
        )
        columns_profile.append(col_prof)

    # Compute data quality & health score
    quality_score = calculate_data_quality(df, columns_profile)

    return DatasetProfile(
        dataset_id=dataset_id,
        row_count=total_rows,
        column_count=total_cols,
        duplicate_rows=duplicate_rows,
        duplicate_percentage=duplicate_pct,
        columns=columns_profile,
        likely_id_columns=likely_id_cols,
        temporal_columns=temporal_cols,
        numeric_columns=numeric_cols,
        categorical_columns=categorical_cols,
        quality=quality_score,
    )


def profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """Backward-compatible quick dictionary profiler."""
    profile = profile_dataset(df)
    return {
        "rows": profile.row_count,
        "columns": profile.column_count,
        "column_names": [c.name for c in profile.columns],
        "missing_values": {c.name: c.null_count for c in profile.columns},
        "duplicate_rows": profile.duplicate_rows,
        "health_score": profile.quality.overall_score,
        "schema": {c.name: c.inferred_type for c in profile.columns},
    }

