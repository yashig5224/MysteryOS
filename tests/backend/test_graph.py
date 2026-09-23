import pytest
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient

# pyrefly: ignore [missing-import]
from app.main import app
# pyrefly: ignore [missing-import]
from app.services.ingestion.dataset_store import dataset_store
# pyrefly: ignore [missing-import]
from app.services.analysis.engine import analysis_engine
# pyrefly: ignore [missing-import]
from app.services.patterns.engine import pattern_engine
# pyrefly: ignore [missing-import]
from app.services.evidence.engine import evidence_engine
# pyrefly: ignore [missing-import]
from app.services.graph.engine import graph_engine

client = TestClient(app)


@pytest.fixture
def sample_graph_dataset():
    """Setup a rich dataset with anomalies, patterns, evidence, and hypotheses via API upload."""
    sample_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample" / "test6_evidence_hypotheses.csv"
    with open(sample_file, "rb") as f:
        content = f.read()

    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("test6_evidence_hypotheses.csv", content, "text/csv")},
    )
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["metadata"]["id"]

    # Run analysis, pattern, and evidence pipelines to populate artifacts
    analysis_engine.analyze(dataset_id, force=True)
    pattern_engine.analyze(dataset_id, force=True)
    evidence_engine.analyze(dataset_id, force=True)

    yield dataset_id

    dataset_store.delete_dataset(dataset_id)


def test_knowledge_graph_synthesis(sample_graph_dataset):
    ds_id = sample_graph_dataset
    graph = graph_engine.get_graph(ds_id, force=True)

    assert graph.dataset_id == ds_id
    assert graph.total_nodes > 0
    assert graph.total_edges > 0

    node_types = {n.type for n in graph.nodes}
    assert "finding" in node_types
    assert "pattern" in node_types
    assert "evidence" in node_types
    assert "hypothesis" in node_types
    assert "thread" in node_types


def test_node_and_edge_relationship_integrity(sample_graph_dataset):
    ds_id = sample_graph_dataset
    graph = graph_engine.get_graph(ds_id, force=False)

    node_ids = {n.id for n in graph.nodes}

    for edge in graph.edges:
        assert edge.source in node_ids, f"Edge source {edge.source} not in graph nodes"
        assert edge.target in node_ids, f"Edge target {edge.target} not in graph nodes"
        assert edge.label in [
            "SUPPORTS",
            "CONTRADICTS",
            "DERIVED_FROM",
            "RELATED_TO",
            "OCCURS_BEFORE",
            "INVESTIGATED_IN",
            "GROUNDS_EVIDENCE",
            "SUPPORTS_EVIDENCE",
            "CORRELATES_WITH",
            "ASSOCIATED_WITH",
            "CHANGES_WITH",
        ]


def test_contradiction_edge_polarity(sample_graph_dataset):
    ds_id = sample_graph_dataset
    graph = graph_engine.get_graph(ds_id, force=False)

    # Check that contradictory evidence nodes have polarity="contradict"
    contra_nodes = [n for n in graph.nodes if n.type == "evidence" and n.polarity == "contradict"]
    if contra_nodes:
        contra_id = contra_nodes[0].id
        # Check connected edges
        contra_edges = [e for e in graph.edges if e.source == contra_id or e.target == contra_id]
        assert len(contra_edges) > 0


def test_graph_node_detail_lookup(sample_graph_dataset):
    ds_id = sample_graph_dataset
    graph = graph_engine.get_graph(ds_id, force=False)

    # Pick first hypothesis node
    hyp_nodes = [n for n in graph.nodes if n.type == "hypothesis"]
    assert len(hyp_nodes) > 0
    target_node = hyp_nodes[0]

    detail = graph_engine.get_node_detail(ds_id, target_node.id)
    assert detail is not None
    assert detail.node.id == target_node.id
    assert detail.node.title == target_node.title
    assert len(detail.connected_nodes) > 0
    assert len(detail.connected_edges) > 0
    assert "statement" in detail.raw_artifact or "status" in detail.raw_artifact


def test_invalid_node_id(sample_graph_dataset):
    ds_id = sample_graph_dataset
    detail = graph_engine.get_node_detail(ds_id, "nonexistent_node_99999")
    assert detail is None

    res = client.get(f"/api/datasets/{ds_id}/graph/node/nonexistent_node_99999")
    assert res.status_code == 404


def test_empty_dataset_graph_handling():
    df = pd.DataFrame({"constant_col": [1, 1, 1, 1, 1]})
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("empty_graph.csv", csv_bytes, "text/csv")},
    )
    assert upload_res.status_code == 201
    ds_id = upload_res.json()["metadata"]["id"]

    graph = graph_engine.get_graph(ds_id, force=True)
    assert graph.dataset_id == ds_id
    assert graph.total_nodes >= 0

    dataset_store.delete_dataset(ds_id)


def test_iot_telemetry_knowledge_graph():
    """Domain-independent IoT telemetry dataset knowledge graph test."""
    sample_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample" / "test7_iot_telemetry.csv"
    assert sample_file.exists()

    with open(sample_file, "rb") as f:
        content = f.read()

    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("test7_iot_telemetry.csv", content, "text/csv")},
    )
    assert upload_res.status_code == 201
    ds_id = upload_res.json()["metadata"]["id"]

    analysis_engine.analyze(ds_id, force=True)
    pattern_engine.analyze(ds_id, force=True)
    evidence_engine.analyze(ds_id, force=True)

    graph = graph_engine.get_graph(ds_id, force=True)
    assert graph.dataset_id == ds_id
    assert graph.total_nodes > 0
    assert graph.total_edges > 0

    dataset_store.delete_dataset(ds_id)


def test_api_graph_endpoints(sample_graph_dataset):
    ds_id = sample_graph_dataset

    # 1. GET /api/datasets/{dataset_id}/graph
    res = client.get(f"/api/datasets/{ds_id}/graph")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert data["total_nodes"] > 0

    # 2. GET /api/datasets/{dataset_id}/graph/node/{node_id}
    node_id = data["nodes"][0]["id"]
    res_node = client.get(f"/api/datasets/{ds_id}/graph/node/{node_id}")
    assert res_node.status_code == 200
    node_data = res_node.json()
    assert node_data["node"]["id"] == node_id
    assert "connected_nodes" in node_data

    # 3. GET /api/graph/{dataset_id}
    res_alt = client.get(f"/api/graph/{ds_id}")
    assert res_alt.status_code == 200
    assert res_alt.json()["total_nodes"] == data["total_nodes"]
