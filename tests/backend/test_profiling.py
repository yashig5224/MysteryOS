import pandas as pd
from app.services.profiling.profiler import profile_dataset, profile_dataframe
from app.services.profiling.schema_detector import infer_column_type
from app.services.profiling.statistics import calculate_numeric_stats, calculate_categorical_stats
from app.services.profiling.quality import calculate_data_quality


def test_profile_dataset_comprehensive():
    df = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "created_at": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"],
        "amount": [100.0, 200.0, None, 400.0, 500.0],
        "status": ["Active", "Pending", "Active", "Active", "Pending"],
    })

    profile = profile_dataset(df, dataset_id="test_ds")
    assert profile.row_count == 5
    assert profile.column_count == 4
    assert profile.duplicate_rows == 0
    assert "id" in profile.likely_id_columns
    assert "created_at" in profile.temporal_columns
    assert profile.quality.overall_score > 0
    assert len(profile.quality.observations) > 0

    # Check numeric stats for 'amount'
    amount_col = next(c for c in profile.columns if c.name == "amount")
    assert amount_col.null_count == 1
    assert amount_col.numeric_stats is not None
    assert amount_col.numeric_stats.mean == 300.0
    assert amount_col.numeric_stats.min == 100.0
    assert amount_col.numeric_stats.max == 500.0

    # Check categorical stats for 'status'
    status_col = next(c for c in profile.columns if c.name == "status")
    assert status_col.categorical_stats is not None
    assert status_col.categorical_stats.cardinality == 2


def test_duplicate_and_missing_value_detection():
    df = pd.DataFrame({
        "a": [1, 2, 2, None],
        "b": ["x", "y", "y", None],
    })
    profile = profile_dataset(df)
    assert profile.duplicate_rows == 1
    assert profile.quality.missing_percentage > 0
    assert profile.quality.duplicate_percentage > 0


def test_backward_compatible_profile_dataframe():
    df = pd.DataFrame({"a": [1, 2], "b": [3, None]})
    result = profile_dataframe(df)
    assert result["rows"] == 2
    assert result["columns"] == 2
    assert result["missing_values"]["b"] == 1

