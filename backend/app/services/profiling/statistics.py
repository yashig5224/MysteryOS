from typing import Optional, Dict, Any
import pandas as pd
import numpy as np

from app.api.schemas.dataset import NumericStats, CategoricalStats, CategoricalValueCount


def safe_float(val: Any) -> Optional[float]:
    """Convert numpy / pandas scalar to clean JSON-serializable float or None."""
    if val is None or pd.isna(val) or np.isneginf(val) or np.isposinf(val):
        return None
    try:
        return round(float(val), 4)
    except (ValueError, TypeError):
        return None


def calculate_numeric_stats(series: pd.Series) -> Optional[NumericStats]:
    """Compute mean, median, min, max, std, quartiles, and zeros for numerical columns."""
    clean_series = pd.to_numeric(series, errors="coerce").dropna()
    if clean_series.empty:
        return None

    try:
        q25 = clean_series.quantile(0.25)
        median = clean_series.median()
        q75 = clean_series.quantile(0.75)
        mean_val = clean_series.mean()
        std_val = clean_series.std()
        min_val = clean_series.min()
        max_val = clean_series.max()
        zeros = int((clean_series == 0).sum())

        return NumericStats(
            mean=safe_float(mean_val),
            median=safe_float(median),
            min=safe_float(min_val),
            max=safe_float(max_val),
            std=safe_float(std_val),
            q25=safe_float(q25),
            q75=safe_float(q75),
            zeros_count=zeros,
        )
    except Exception:
        return None


def calculate_categorical_stats(series: pd.Series, top_n: int = 10) -> Optional[CategoricalStats]:
    """Compute value distributions and cardinality for categorical columns."""
    clean_series = series.dropna()
    total_valid = len(clean_series)
    if total_valid == 0:
        return None

    cardinality = int(clean_series.nunique())
    val_counts = clean_series.astype(str).value_counts().head(top_n)

    top_values = []
    for val, count in val_counts.items():
        top_values.append(
            CategoricalValueCount(
                value=str(val)[:100],  # truncate long text
                count=int(count),
                percentage=round((count / total_valid) * 100, 2),
            )
        )

    return CategoricalStats(
        cardinality=cardinality,
        top_values=top_values,
    )

