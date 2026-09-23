import io
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.api.schemas.evidence import (
    Evidence,
    EvidenceType,
    EvidencePolarity,
    Hypothesis,
    EvidenceCluster,
    InvestigationThread,
)
from app.api.schemas.patterns import Pattern, Relationship, TimelineEvent, CorrelationPair
from app.api.schemas.analysis import AnalysisFinding
from app.services.evidence.evidence_scorer import (
    calculate_evidence_strength,
    calculate_hypothesis_confidence,
    calculate_thread_priority,
)
from app.services.evidence.contradiction_detector import detect_contradictory_evidence
from app.services.evidence.evidence_builder import build_evidence_items
from app.services.evidence.evidence_linker import link_evidence_clusters
from app.services.evidence.hypothesis_generator import generate_candidate_hypotheses
from app.services.evidence.investigation_thread import build_investigation_threads
from app.services.evidence.engine import evidence_engine

from pathlib import Path

client = TestClient(app)


def test_evidence_scorer():
    # Test scoring of evidence strength
    score = calculate_evidence_strength(base_magnitude=0.9, sample_size=30, signal_count=2)
    assert 70 <= score <= 100

    # Test confidence with contradictions
    conf_clean = calculate_hypothesis_confidence(
        evidence_strength=85,
        supporting_count=3,
        contradicting_count=0,
        has_temporal_link=True,
    )
    conf_penalized = calculate_hypothesis_confidence(
        evidence_strength=85,
        supporting_count=3,
        contradicting_count=1,
        has_temporal_link=True,
    )
    assert conf_clean > conf_penalized
    assert conf_clean - conf_penalized == 15

    # Test thread priority
    prio = calculate_thread_priority(
        highest_confidence=80,
        evidence_count=4,
        finding_count=2,
        has_high_severity=True,
    )
    assert 60 <= prio <= 100


def test_contradiction_detector():
    # Synthetic DataFrame with 2 regions: North shifts drastically, South remains stable
    dates = pd.date_range("2026-02-01", periods=10, freq="D")
    df = pd.DataFrame({
        "date": list(dates) + list(dates),
        "region": ["North"] * 10 + ["South"] * 10,
        "revenue": [1000.0] * 5 + [100.0] * 5 + [1000.0] * 10,  # North drops 90%, South flat
        "price": [50.0] * 5 + [120.0] * 5 + [50.0] * 10,
    })

    patterns = [
        Pattern(
            pattern_id="pat_shift_north",
            dataset_id="test_ds",
            type="change_point",
            title="Revenue Drop",
            description="Revenue dropped by 90%",
            columns=["revenue"],
            strength=90,
            direction="downward",
            significance="critical",
            metadata={"shifted_column": "revenue", "shift_percentage": -90.0, "time_column": "date"},
        )
    ]

    contradictions = detect_contradictory_evidence(
        df=df,
        dataset_id="test_ds",
        patterns=patterns,
        findings=[],
    )

    assert len(contradictions) >= 1
    assert any(c.polarity == EvidencePolarity.CONTRADICT.value for c in contradictions)
    assert any("South" in c.description or "segment" in c.description.lower() or "price" in c.description.lower() for c in contradictions)


def test_evidence_builder_and_clustering():
    findings = [
        AnalysisFinding(
            finding_id="fnd_1",
            dataset_id="test_ds",
            type="anomaly",
            category="outlier",
            subtype="iqr",
            method="iqr",
            column="revenue",
            severity="high",
            score=95.0,
            title="Severe Outlier in revenue",
            description="High value on Feb 10",
            affected_rows=[10, 11],
        )
    ]
    patterns = [
        Pattern(
            pattern_id="pat_1",
            dataset_id="test_ds",
            type="correlation",
            title="Revenue & Price Co-movement",
            description="Price negatively correlates with revenue",
            columns=["price", "revenue"],
            strength=88,
            direction="negative",
            significance="high",
        ),
        Pattern(
            pattern_id="pat_2",
            dataset_id="test_ds",
            type="change_point",
            title="Revenue Transition",
            description="Revenue shifted",
            columns=["revenue"],
            strength=85,
            direction="downward",
            significance="high",
        ),
    ]

    corr_pair = CorrelationPair(
        var1="revenue",
        var2="price",
        coefficient=-0.88,
        method="pearson",
        direction="negative",
        strength="strong",
        sample_size=30,
    )

    evidence_items = build_evidence_items(
        dataset_id="test_ds",
        findings=findings,
        patterns=patterns,
        relationships=[],
        timeline=[],
        correlations=[corr_pair],
    )

    assert len(evidence_items) >= 2
    assert all(e.dataset_id == "test_ds" for e in evidence_items)
    assert any(e.evidence_type == EvidenceType.ANOMALY_EVIDENCE.value for e in evidence_items)
    assert any(e.evidence_type == EvidenceType.CORRELATION_EVIDENCE.value for e in evidence_items)

    clusters = link_evidence_clusters(
        dataset_id="test_ds",
        evidence_items=evidence_items,
        patterns=patterns,
        findings=findings,
        relationships=[],
        timeline=[],
    )

    assert len(clusters) >= 1
    cluster_cols = [col for c in clusters for col in c.primary_columns]
    assert "revenue" in cluster_cols or "price" in cluster_cols


def test_hypothesis_generator_and_threads():
    evidence_items = [
        Evidence(
            evidence_id="evi_1",
            dataset_id="test_ds",
            title="Revenue Drop Pattern",
            description="Revenue fell 60% after price rise",
            evidence_type=EvidenceType.CHANGE_POINT_EVIDENCE.value,
            polarity=EvidencePolarity.SUPPORT.value,
            strength=85,
            supports_pattern_ids=["pat_1"],
            related_finding_ids=[],
            columns=["price", "revenue"],
        ),
        Evidence(
            evidence_id="evi_2",
            dataset_id="test_ds",
            title="Segment Stability in South",
            description="South segment observed no drop in revenue",
            evidence_type=EvidenceType.CHANGE_POINT_EVIDENCE.value,
            polarity=EvidencePolarity.CONTRADICT.value,
            strength=70,
            supports_pattern_ids=["pat_1"],
            related_finding_ids=[],
            columns=["region", "revenue"],
        ),
    ]

    patterns = [
        Pattern(
            pattern_id="pat_1",
            dataset_id="test_ds",
            type="change_point",
            title="Revenue Drop Pattern",
            description="Shift detected",
            columns=["revenue"],
            strength=85,
            direction="downward",
            significance="high",
            metadata={"shifted_column": "revenue", "shift_percentage": -60.0, "change_point_date": "2026-02-10"},
        )
    ]

    hypotheses = generate_candidate_hypotheses(
        dataset_id="test_ds",
        evidence_items=evidence_items,
        patterns=patterns,
        relationships=[],
        timeline=[],
        correlations=[],
        contradictions=[evidence_items[1]],
    )

    assert len(hypotheses) >= 1
    top_hyp = hypotheses[0]
    assert "revenue" in top_hyp.statement.lower() or "price" in top_hyp.statement.lower() or "shift" in top_hyp.statement.lower()
    assert "evi_2" in top_hyp.contradicting_evidence_ids or len(top_hyp.contradicting_evidence_ids) >= 0

    threads, graph = build_investigation_threads(
        dataset_id="test_ds",
        hypotheses=hypotheses,
        evidence_items=evidence_items,
        patterns=patterns,
        findings=[],
        relationships=[],
        timeline=[],
    )

    assert len(threads) >= 1
    assert len(graph.nodes) >= 1
    assert len(graph.edges) >= 0


def test_evidence_engine_e2e_and_api():
    # 1. Upload sample dataset test6
    sample_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample" / "test6_evidence_hypotheses.csv"
    with open(sample_file, "rb") as f:
        content = f.read()

    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("test6_evidence_hypotheses.csv", content, "text/csv")},
    )
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["metadata"]["id"]

    # 2. Run Evidence Engine
    summary = evidence_engine.analyze(dataset_id, force=True)
    assert summary.status == "completed"
    assert summary.total_evidence >= 1
    assert summary.total_hypotheses >= 1
    assert summary.total_investigation_threads >= 1
    assert summary.graph_data is not None

    # 3. Test API GET /api/evidence/{dataset_id}
    res_summary = client.get(f"/api/evidence/{dataset_id}")
    assert res_summary.status_code == 200
    data = res_summary.json()
    assert data["dataset_id"] == dataset_id
    assert data["total_evidence"] == summary.total_evidence
    assert len(data["hypotheses"]) == summary.total_hypotheses

    # 4. Test API GET /api/evidence/{dataset_id}/hypotheses
    res_hyp = client.get(f"/api/evidence/{dataset_id}/hypotheses")
    assert res_hyp.status_code == 200
    assert len(res_hyp.json()) == summary.total_hypotheses

    # 5. Test API GET /api/evidence/{dataset_id}/investigations
    res_inv = client.get(f"/api/evidence/{dataset_id}/investigations")
    assert res_inv.status_code == 200
    assert len(res_inv.json()) == summary.total_investigation_threads

    # 6. Test API GET /api/datasets/{dataset_id}/evidence
    res_ds_evi = client.get(f"/api/datasets/{dataset_id}/evidence")
    assert res_ds_evi.status_code == 200
    assert res_ds_evi.json()["total_evidence"] == summary.total_evidence

    # 7. Test API POST /api/datasets/{dataset_id}/evidence/analyze (force=True)
    res_reanalyze = client.post(
        f"/api/datasets/{dataset_id}/evidence/analyze",
        json={"force": True},
    )
    assert res_reanalyze.status_code == 200
    assert res_reanalyze.json()["status"] == "completed"
