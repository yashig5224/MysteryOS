import io
import json
import pandas as pd
# pyrefly: ignore [missing-import]
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.analysis.engine import AnalysisEngine
from app.services.analysis.anomaly_detector import detect_numerical_anomalies
from app.services.analysis.categorical_analyzer import detect_categorical_anomalies
from app.services.analysis.temporal_analyzer import detect_temporal_anomalies
from app.services.analysis.statistical_analyzer import detect_statistical_anomalies
from app.services.analysis.scoring import deduplicate_and_merge_findings, normalize_score, classify_severity
from app.services.profiling.profiler import profile_dataset

client = TestClient(app)


def test_score_normalization_and_severity():
    assert normalize_score(-10) == 0
    assert normalize_score(150) == 100
    assert normalize_score(75.4) == 75

    assert classify_severity(95) == "high"
    assert classify_severity(80) == "high"
    assert classify_severity(79) == "medium"
    assert classify_severity(50) == "medium"
    assert classify_severity(49) == "low"
    assert classify_severity(10) == "low"


def test_iqr_and_zscore_numerical_outliers():
    # Synthetic normal data with known extreme outliers
    values = [100.0, 102.0, 98.0, 101.0, 99.0, 103.0, 97.0, 100.0, 101.0, 99.0, 102.0, 98.0, 100.0, 101.0, 99.0, 5000.0]
    df = pd.DataFrame({"amount": values, "user_id": list(range(len(values)))})
    profile = profile_dataset(df, dataset_id="test_ds")

    findings = detect_numerical_anomalies(df, dataset_id="test_ds", profile=profile)
    assert len(findings) > 0

    # Ensure user_id was excluded from anomaly detection
    for f in findings:
        assert f.column == "amount"
        assert f.column != "user_id"

    # Outlier at index 15 (5000.0) should be found
    outlier_findings = [f for f in findings if f.observed_value == 5000.0]
    assert len(outlier_findings) > 0
    assert outlier_findings[0].severity in {"high", "medium"}


def test_categorical_rare_and_dominant_detection():
    # 40 rows: 38 "Standard", 1 "Gold", 1 "SuperRare"
    categories = ["Standard"] * 38 + ["Gold", "SuperRare"]
    df = pd.DataFrame({"tier": categories, "id": list(range(len(categories)))})
    profile = profile_dataset(df, dataset_id="test_cat")

    findings = detect_categorical_anomalies(df, dataset_id="test_cat", profile=profile)
    assert len(findings) > 0

    # Dominant category detected
    dom_findings = [f for f in findings if f.subtype == "categorical_dominant"]
    assert len(dom_findings) > 0

    # Rare category detected
    rare_findings = [f for f in findings if f.subtype == "categorical_rare"]
    assert len(rare_findings) > 0
    rare_vals = [f.observed_value for f in rare_findings]
    assert any("SuperRare" in str(v) for v in rare_vals)


def test_temporal_anomaly_spikes_and_drops():
    dates = pd.date_range("2026-01-01", periods=10, freq="D").strftime("%Y-%m-%d").tolist()
    # Baseline 100, then spike to 1000 on day 5, then drop to 50 on day 6
    traffic = [100, 105, 98, 102, 1000, 50, 100, 99, 101, 100]
    df = pd.DataFrame({"date": dates, "traffic": traffic})
    profile = profile_dataset(df, dataset_id="test_temp")

    findings = detect_temporal_anomalies(df, dataset_id="test_temp", profile=profile)
    assert len(findings) > 0

    spike_findings = [f for f in findings if f.subtype == "sudden_increase"]
    drop_findings = [f for f in findings if f.subtype == "sudden_decrease"]
    assert len(spike_findings) > 0
    assert len(drop_findings) > 0


def test_deduplication_of_overlapping_detections():
    # Create dataset with extreme outlier detected by IQR, Z-score, and Isolation Forest
    values = [50.0] * 30 + [99999.0]
    df = pd.DataFrame({"metric": values})
    profile = profile_dataset(df, dataset_id="test_dedup")

    raw_findings = detect_numerical_anomalies(df, dataset_id="test_dedup", profile=profile)
    deduped = deduplicate_and_merge_findings(raw_findings)

    # All detections on row 30 should be merged into a single finding
    row_30_findings = [f for f in deduped if f.row_reference == 30]
    assert len(row_30_findings) == 1
    assert len(row_30_findings[0].detected_by) >= 2


def test_empty_and_small_dataset_handling():
    # Empty DataFrame
    empty_df = pd.DataFrame()
    num_f = detect_numerical_anomalies(empty_df, "empty")
    cat_f = detect_categorical_anomalies(empty_df, "empty")
    temp_f = detect_temporal_anomalies(empty_df, "empty")
    stat_f = detect_statistical_anomalies(empty_df, "empty")
    assert num_f == []
    assert cat_f == []
    assert temp_f == []
    assert stat_f == []

    # Small 2-row DataFrame
    small_df = pd.DataFrame({"a": [1, 2], "b": ["x", "y"]})
    num_f2 = detect_numerical_anomalies(small_df, "small")
    assert isinstance(num_f2, list)


def test_api_analyze_and_retrieval_flow():
    # 1. Upload a dataset with outliers
    csv_content = (
        "txn_id,timestamp,amount,status\n"
        "T1,2026-01-01 10:00:00,100.0,Completed\n"
        "T2,2026-01-02 10:00:00,105.0,Completed\n"
        "T3,2026-01-03 10:00:00,98.0,Completed\n"
        "T4,2026-01-04 10:00:00,102.0,Completed\n"
        "T5,2026-01-05 10:00:00,95.0,Completed\n"
        "T6,2026-01-06 10:00:00,101.0,Completed\n"
        "T7,2026-01-07 10:00:00,99.0,Completed\n"
        "T8,2026-01-08 10:00:00,103.0,Completed\n"
        "T9,2026-01-09 10:00:00,97.0,Completed\n"
        "T10,2026-01-10 10:00:00,8500.0,Flagged\n"
    )
    files = {"file": ("investigation_data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/datasets/upload", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["metadata"]["id"]

    # 2. Trigger analysis
    analyze_res = client.post(f"/api/datasets/{dataset_id}/analyze")
    assert analyze_res.status_code == 200
    summary = analyze_res.json()
    assert summary["dataset_id"] == dataset_id
    assert summary["status"] == "completed"
    assert summary["total_findings"] > 0
    assert "findings" in summary

    # 3. Test caching with GET analysis
    get_res = client.get(f"/api/datasets/{dataset_id}/analysis")
    assert get_res.status_code == 200
    assert get_res.json()["total_findings"] == summary["total_findings"]

    # 4. Test GET anomalies endpoint
    anom_res = client.get(f"/api/datasets/{dataset_id}/anomalies")
    assert anom_res.status_code == 200
    assert isinstance(anom_res.json(), list)

    # 5. Test GET insights endpoint
    ins_res = client.get(f"/api/datasets/{dataset_id}/insights")
    assert ins_res.status_code == 200
    assert isinstance(ins_res.json(), list)

    # 6. Clean up
    client.delete(f"/api/datasets/{dataset_id}")


def test_synthetic_dataset_1_numerical_outliers():
    from pathlib import Path
    sample_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample" / "test1_numerical_outliers.csv"
    assert sample_file.exists()

    with open(sample_file, "rb") as f:
        files = {"file": ("test1_numerical_outliers.csv", f, "text/csv")}
        res = client.post("/api/datasets/upload", files=files)
        assert res.status_code == 201
        dataset_id = res.json()["metadata"]["id"]

    analyze_res = client.post(f"/api/datasets/{dataset_id}/analyze")
    assert analyze_res.status_code == 200
    data = analyze_res.json()
    assert data["total_findings"] > 0
    # Ensure outlier apex/zenith (580k/720k) detected
    revenue_findings = [f for f in data["findings"] if f["column"] == "revenue"]
    assert len(revenue_findings) >= 2

    client.delete(f"/api/datasets/{dataset_id}")


def test_synthetic_dataset_2_timeseries_spike():
    from pathlib import Path
    sample_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample" / "test2_timeseries_spike_drop.csv"
    assert sample_file.exists()

    with open(sample_file, "rb") as f:
        files = {"file": ("test2_timeseries_spike_drop.csv", f, "text/csv")}
        res = client.post("/api/datasets/upload", files=files)
        assert res.status_code == 201
        dataset_id = res.json()["metadata"]["id"]

    analyze_res = client.post(f"/api/datasets/{dataset_id}/analyze")
    assert analyze_res.status_code == 200
    data = analyze_res.json()
    assert data["total_findings"] > 0

    client.delete(f"/api/datasets/{dataset_id}")


def test_synthetic_dataset_3_categorical_anomalies():
    from pathlib import Path
    sample_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample" / "test3_categorical_anomalies.json"
    assert sample_file.exists()

    with open(sample_file, "rb") as f:
        files = {"file": ("test3_categorical_anomalies.json", f, "application/json")}
        res = client.post("/api/datasets/upload", files=files)
        assert res.status_code == 201
        dataset_id = res.json()["metadata"]["id"]

    analyze_res = client.post(f"/api/datasets/{dataset_id}/analyze")
    assert analyze_res.status_code == 200
    data = analyze_res.json()
    assert data["total_findings"] > 0

    client.delete(f"/api/datasets/{dataset_id}")


def test_synthetic_dataset_4_missing_and_ids():
    from pathlib import Path
    sample_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample" / "test4_missing_and_ids.csv"
    assert sample_file.exists()

    with open(sample_file, "rb") as f:
        files = {"file": ("test4_missing_and_ids.csv", f, "text/csv")}
        res = client.post("/api/datasets/upload", files=files)
        assert res.status_code == 201
        dataset_id = res.json()["metadata"]["id"]

    analyze_res = client.post(f"/api/datasets/{dataset_id}/analyze")
    assert analyze_res.status_code == 200
    data = analyze_res.json()
    assert data["status"] == "completed"

    # Ensure UUID and row_id were excluded from numerical anomaly searches
    for f in data["findings"]:
        assert f["column"] not in {"row_id", "uuid", "account_number"}

    client.delete(f"/api/datasets/{dataset_id}")

