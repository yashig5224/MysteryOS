from typing import Tuple
import pandas as pd
import numpy as np


ID_KEYWORDS = {"id", "uuid", "key", "code", "hash", "guid", "account", "pk", "fk", "token", "ssn", "identifier"}


def infer_column_type(series: pd.Series, col_name: str) -> Tuple[str, bool, bool]:
    """
    Infer semantic type of a series.
    Returns: (inferred_type, is_likely_id, is_temporal)
    inferred_type is one of: 'numeric', 'categorical', 'datetime', 'boolean', 'id', 'text'
    """
    clean_series = series.dropna()
    total_valid = len(clean_series)

    if total_valid == 0:
        return "text", False, False

    col_lower = str(col_name).lower()
    unique_count = clean_series.nunique()
    uniqueness_ratio = unique_count / total_valid if total_valid > 0 else 0

    # 1. Boolean check
    if pd.api.types.is_bool_dtype(series):
        return "boolean", False, False

    if unique_count <= 2:
        val_set = {str(v).strip().lower() for v in clean_series.unique()}
        if val_set.issubset({"0", "1", "true", "false", "yes", "no", "t", "f", "y", "n"}):
            return "boolean", False, False

    # 2. Datetime check
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime", False, True

    if series.dtype == object or pd.api.types.is_string_dtype(series):
        # Sample non-null values to test for date parsing
        sample = clean_series.head(20).astype(str)
        date_hits = 0
        for val in sample:
            # Quick format heuristics before running full parser
            val_str = val.strip()
            if (
                any(char in val_str for char in ["-", "/", "T", ":"])
                and len(val_str) >= 6
                and len(val_str) <= 35
            ):
                try:
                    pd.to_datetime(val_str)
                    date_hits += 1
                except Exception:
                    pass
        if date_hits >= len(sample) * 0.8:
            return "datetime", False, True

    # 3. Numeric check
    if pd.api.types.is_numeric_dtype(series):
        # Numeric column is only an ID if its name explicitly contains ID keywords
        has_id_keyword = (
            any(kw == col_lower or f"_{kw}" in col_lower or f"{kw}_" in col_lower for kw in ID_KEYWORDS)
            or col_lower in {"id", "pk", "fk", "key", "uuid", "row_id", "item_id"}
        )
        if has_id_keyword and (pd.api.types.is_integer_dtype(series) or (series.dropna() % 1 == 0).all()):
            return "id", True, False

        # If very few unique values (e.g. rating 1 to 5), check if categorical
        if unique_count <= 5 and total_valid >= 20 and not has_id_keyword:
            return "categorical", False, False

        return "numeric", False, False

    # 4. String / Object types
    has_id_keyword = (
        any(kw == col_lower or f"_{kw}" in col_lower or f"{kw}_" in col_lower for kw in ID_KEYWORDS)
        or col_lower in {"id", "pk", "fk", "key", "uuid", "code"}
    )
    if (uniqueness_ratio == 1.0 or (has_id_keyword and uniqueness_ratio > 0.85)) and unique_count > 3:
        return "id", True, False

    # Categorical vs Text
    if unique_count <= 50 or uniqueness_ratio < 0.2:
        return "categorical", False, False

    # Check average string length
    avg_len = clean_series.astype(str).str.len().mean()
    if avg_len > 40:
        return "text", False, False

    return "categorical", False, False


def detect_schema(df: pd.DataFrame) -> dict:
    """Return dictionary of physical column dtypes and inferred semantic types."""
    schema = {}
    for col in df.columns:
        series = df[col]
        inferred_type, is_id, is_temp = infer_column_type(series, col)
        schema[col] = {
            "dtype": str(series.dtype),
            "inferred_type": inferred_type,
            "is_likely_id": is_id,
            "is_temporal": is_temp,
        }
    return schema

