import io
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.api.schemas.patterns import Pattern, Relationship, TimelineEvent, CorrelationPair
from app.services.patterns.correlation_analyzer import analyze_correlations
from app.services.patterns.trend_analyzer import analyze_trends
from app.services.patterns.group_analyzer import analyze_group_differences
from app.services.patterns.change_point_analyzer import analyze_change_points
from app.services.patterns.relationship_analyzer import analyze_relationships
from app.services.patterns.timeline_builder import build_investigation_timeline
from app.services.patterns.scoring import calculate_pattern_strength, calculate_event_importance
from app.services.profiling.profiler import profile_dataset

client = TestClient(app)


def test_correlation_analyzer():
    # Co-moving variables x and y (strong positive correlation)
    x = np.linspace(10, 100, 30)
    y = 2.5 * x + np.random.normal(0, 2, 30)
    z = np.random.normal(50, 5, 30)  # uncorrelated
    df = pd.DataFrame({"x_metric": x, "y_metric": y, "z_noise": z})
    profile = profile_dataset(df)

    pairs, patterns = analyze_correlations(df, dataset_id="test_ds", profile=profile)
    assert len(pairs) >= 1
    top_pair = pairs[0]
    assert {top_pair.var1, top_pair.var2} == {"x_metric", "y_metric"}
    assert top_pair.coefficient > 0.85
    assert top_pair.direction == "positive"

    # Ensure no duplicate reversed pair
    pair_tuples = [(p.var1, p.var2) for p in pairs]
    assert len(pair_tuples) == len(set(tuple(sorted(p)) for p in pair_tuples))


def test_trend_analyzer():
    dates = pd.date_range("2026-01-01", periods=20, freq="D")
    # Monotonically increasing revenue
    revenue = np.linspace(1000, 5000, 20) + np.random.normal(0, 50, 20)
    df = pd.DataFrame({"record_date": dates, "revenue": revenue})
    profile = profile_dataset(df)

    patterns = analyze_trends(df, dataset_id="test_ds", profile=profile)
    assert len(patterns) >= 1
    assert patterns[0].type == "trend"
    assert patterns[0].direction == "upward"
    assert "revenue" in patterns[0].columns


def test_group_analyzer():
    # 2 distinct segments with large disparity
    regions = ["East"] * 15 + ["West"] * 15
    sales = [1500.0] * 15 + [400.0] * 15
    df = pd.DataFrame({"region": regions, "sales": sales})
    profile = profile_dataset(df)

    patterns = analyze_group_differences(df, dataset_id="test_ds", profile=profile)
    assert len(patterns) >= 1
    assert patterns[0].type == "group_difference"
    assert patterns[0].metadata["disparity_percentage"] > 100.0


def test_change_point_analyzer():
    dates = pd.date_range("2026-01-01", periods=20, freq="D")
    # Shift from mean 100 to mean 500 at index 10
    metric = [100.0] * 10 + [500.0] * 10
    df = pd.DataFrame({"timestamp": dates, "throughput": metric})
    profile = profile_dataset(df)

    patterns = analyze_change_points(df, dataset_id="test_ds", profile=profile)
    assert len(patterns) >= 1
    assert patterns[0].type == "change_point"
    assert patterns[0].metadata["shift_percentage"] > 200.0


def test_relationship_and_timeline_generation():
    corr_pair = CorrelationPair(
        var1="revenue",
        var2="customers",
        coefficient=0.89,
        method="pearson",
        direction="positive",
        strength="strong",
        sample_size=50,
    )
    pattern = Pattern(
        pattern_id="pat_123",
        dataset_id="test_ds",
        type="correlation",
        title="Revenue & Customers Correlation",
        description="Co-moving",
        columns=["revenue", "customers"],
        strength=85,
        direction="positive",
        significance="high",
    )

    relationships = analyze_relationships(
        dataset_id="test_ds",
        patterns=[pattern],
        correlations=[corr_pair],
    )
    assert len(relationships) >= 1
    assert relationships[0].relationship_type == "CORRELATES_WITH"
    assert relationships[0].source == "revenue"
    assert relationships[0].target == "customers"


def test_pattern_api_endpoints_flow():
    # 1. Upload dataset with time, correlations, and groups
    dates = pd.date_range("2026-01-01", periods=20, freq="D")
    sales = np.linspace(100, 1000, 20)
    costs = 0.5 * sales + 10
    depts = ["Sales"] * 10 + ["Engineering"] * 10
    df = pd.DataFrame({
        "event_date": dates.strftime("%Y-%m-%d"),
        "sales": sales,
        "costs": costs,
        "dept": depts,
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    files = {"file": ("patterns_dataset.csv", io.BytesIO(csv_bytes), "text/csv")}
    upload_res = client.post("/api/datasets/upload", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["metadata"]["id"]

    # 2. Trigger pattern discovery
    pat_res = client.post(f"/api/datasets/{dataset_id}/patterns/analyze")
    assert pat_res.status_code == 200
    summary = pat_res.json()
    assert summary["dataset_id"] == dataset_id
    assert summary["status"] == "completed"
    assert summary["total_patterns"] > 0
    assert summary["total_relationships"] > 0
    assert "correlations" in summary

    # 3. Test GET patterns summary
    get_pat_res = client.get(f"/api/datasets/{dataset_id}/patterns")
    assert get_pat_res.status_code == 200
    assert get_pat_res.json()["total_patterns"] == summary["total_patterns"]

    # 4. Test GET relationships
    get_rel_res = client.get(f"/api/datasets/{dataset_id}/relationships")
    assert get_rel_res.status_code == 200
    assert isinstance(get_rel_res.json(), list)

    # 5. Test GET timeline
    get_time_res = client.get(f"/api/datasets/{dataset_id}/timeline")
    assert get_time_res.status_code == 200
    assert isinstance(get_time_res.json(), list)

    # 6. Test alias route
    alias_res = client.get(f"/api/patterns/{dataset_id}")
    assert alias_res.status_code == 200

    # 7. Clean up
    client.delete(f"/api/datasets/{dataset_id}")


def test_synthetic_dataset_5_patterns_timeline():
    from pathlib import Path
    sample_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample" / "test5_patterns_timeline.csv"
    assert sample_file.exists()

    with open(sample_file, "rb") as f:
        files = {"file": ("test5_patterns_timeline.csv", f, "text/csv")}
        res = client.post("/api/datasets/upload", files=files)
        assert res.status_code == 201
        dataset_id = res.json()["metadata"]["id"]

    # 1. Run Phase 3 analysis first
    an_res = client.post(f"/api/datasets/{dataset_id}/analyze")
    assert an_res.status_code == 200

    # 2. Run Phase 4 pattern discovery
    pat_res = client.post(f"/api/datasets/{dataset_id}/patterns/analyze")
    assert pat_res.status_code == 200
    data = pat_res.json()

    assert data["total_patterns"] > 0
    assert data["total_relationships"] > 0
    assert len(data["correlations"]) > 0
    assert len(data["timeline"]) > 0

    # Verify marketing_spend <-> new_leads correlation
    corr_vars = [set([c["var1"], c["var2"]]) for c in data["correlations"]]
    assert {"marketing_spend", "new_leads"} in corr_vars or {"marketing_spend", "conversions"} in corr_vars

    client.delete(f"/api/datasets/{dataset_id}")

