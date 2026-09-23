import pytest
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.services.ingestion.dataset_store import dataset_store
from app.services.analysis.engine import analysis_engine
from app.services.patterns.engine import pattern_engine
from app.services.evidence.engine import evidence_engine
from app.services.ai.engine import investigation_engine
from app.services.ai.retriever import StructuredRetriever
from app.services.ai.context_builder import ContextBuilder
from app.services.ai.providers.mock_provider import MockProvider
from app.services.ai.guardrails import InvestigationGuardrails
from app.services.ai.response_parser import ResponseParser
from app.services.ai.chat_store import chat_store
from app.services.ai.cache import investigation_cache
from app.api.schemas.investigation import (
    InvestigationRequest,
    InvestigationMode,
    InvestigationMessage,
)

client = TestClient(app)


@pytest.fixture
def sample_evidence_dataset():
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
    chat_store.reset_history(dataset_id)
    investigation_cache.clear(dataset_id)


def test_structured_retriever(sample_evidence_dataset):
    ds_id = sample_evidence_dataset
    retriever = StructuredRetriever()

    context = retriever.retrieve_context(ds_id)
    assert "dataset_profile" in context
    assert "findings" in context
    assert "patterns" in context
    assert "evidence" in context
    assert "hypotheses" in context
    assert "threads" in context

    assert len(context["findings"]) > 0
    assert len(context["evidence"]) > 0
    assert len(context["hypotheses"]) > 0


def test_context_builder_budgeting(sample_evidence_dataset):
    ds_id = sample_evidence_dataset
    retriever = StructuredRetriever()
    raw_context = retriever.retrieve_context(ds_id)

    builder = ContextBuilder(max_chars=3000)
    budgeted = builder.build_budgeted_context(raw_context, mode="overview")

    assert "hypotheses" in budgeted
    assert "contradictions" in budgeted
    assert "evidence" in budgeted
    assert len(budgeted["hypotheses"]) <= 3


def test_mock_provider_modes(sample_evidence_dataset):
    ds_id = sample_evidence_dataset
    retriever = StructuredRetriever()
    builder = ContextBuilder()
    context = builder.build_budgeted_context(retriever.retrieve_context(ds_id))

    provider = MockProvider()

    # Anomaly mode
    resp_anomaly = provider.generate_investigation_response(
        question="What is the leading anomaly?",
        context=context,
        system_prompt="Test system prompt",
        mode="anomaly",
    )
    assert len(resp_anomaly.answer) > 20
    assert len(resp_anomaly.cited_source_ids) > 0

    # Hypothesis mode
    resp_hyp = provider.generate_investigation_response(
        question="Why did revenue drop?",
        context=context,
        system_prompt="Test system prompt",
        mode="hypothesis",
    )
    assert "hypothesis" in resp_hyp.answer.lower() or "candidate" in resp_hyp.answer.lower()

    # Next step mode
    resp_next = provider.generate_investigation_response(
        question="What should I investigate next?",
        context=context,
        system_prompt="Test system prompt",
        mode="next_step",
    )
    assert "investigate" in resp_next.answer.lower() or "step" in resp_next.answer.lower()


def test_response_parser_source_validation(sample_evidence_dataset):
    ds_id = sample_evidence_dataset
    retriever = StructuredRetriever()
    raw_context = retriever.retrieve_context(ds_id)

    # Get a real finding ID from context
    real_fnd_id = raw_context["findings"][0]["id"]

    fake_answer = f"The anomaly [{real_fnd_id}] was severe, but [EVD-99999] was fake."
    raw_cited = [real_fnd_id, "EVD-99999", "pat_nonexistent"]

    cleaned_text, validated_sources = ResponseParser.validate_and_enrich_sources(
        answer_text=fake_answer,
        raw_cited_ids=raw_cited,
        raw_context=raw_context,
    )

    validated_ids = [s.id.lower() for s in validated_sources]
    assert real_fnd_id.lower() in validated_ids
    assert "evd-99999" not in validated_ids
    assert "pat_nonexistent" not in validated_ids
    assert "evd-99999" not in cleaned_text.lower()


def test_guardrails_causality_and_contradictions(sample_evidence_dataset):
    raw_text = "This proves that pricing definitely caused revenue loss."
    sanitized = InvestigationGuardrails.sanitize_causal_language(raw_text)
    assert "proves that" not in sanitized
    assert "definitely caused" not in sanitized
    assert "suggests that" in sanitized or "associated with" in sanitized

    # Contradiction injection test
    context_with_contra = {
        "contradictions": [
            {"id": "evd_998", "observation": "Revenue grew in East region despite high price"}
        ]
    }
    answer_without_caveat = "Pricing increase is associated with lower sales."
    guarded = InvestigationGuardrails.apply_all(answer_without_caveat, context_with_contra)
    assert "Investigative Caveat" in guarded
    assert "evd_998" in guarded


def test_chat_store_and_cache(sample_evidence_dataset):
    ds_id = sample_evidence_dataset
    chat_store.reset_history(ds_id)

    msg = InvestigationMessage(
        message_id="msg_001",
        role="user",
        content="Is there contradictory evidence?",
        timestamp="2026-01-01T00:00:00Z",
    )
    chat_store.append_message(ds_id, msg)

    history = chat_store.get_history(ds_id)
    assert len(history) == 1
    assert history[0].content == "Is there contradictory evidence?"

    # Reset
    chat_store.reset_history(ds_id)
    assert len(chat_store.get_history(ds_id)) == 0


def test_investigation_engine_full_flow(sample_evidence_dataset):
    ds_id = sample_evidence_dataset
    req = InvestigationRequest(
        question="Why did revenue drop after the price change?",
        mode=InvestigationMode.HYPOTHESIS,
    )

    resp = investigation_engine.investigate(ds_id, req)
    assert resp.dataset_id == ds_id
    assert len(resp.answer) > 20
    assert resp.confidence in ["low", "moderate", "high"]
    assert len(resp.sources) > 0
    assert len(resp.suggested_questions) > 0

    # Summary
    summary = investigation_engine.generate_investigation_summary(ds_id)
    assert summary.dataset_id == ds_id
    assert summary.primary_anomaly is not None
    assert summary.leading_hypothesis is not None

    # Suggested questions
    sqs = investigation_engine.get_suggested_questions(ds_id)
    assert len(sqs) >= 3


def test_api_investigation_endpoints(sample_evidence_dataset):
    ds_id = sample_evidence_dataset

    # 1. Ask question
    res = client.post(
        f"/api/datasets/{ds_id}/investigate",
        json={"question": "What is the most critical pattern in this data?", "mode": "pattern"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "sources" in data
    assert "response_id" in data

    # 2. Ask via alias /ask
    res_alias = client.post(
        f"/api/datasets/{ds_id}/ask",
        json={"question": "What should I investigate next?", "mode": "next_step"}
    )
    assert res_alias.status_code == 200

    # 3. Get summary
    res_sum = client.get(f"/api/datasets/{ds_id}/investigation/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["dataset_id"] == ds_id

    # 4. Get suggested questions
    res_sq = client.get(f"/api/datasets/{ds_id}/investigation/suggested-questions")
    assert res_sq.status_code == 200
    assert len(res_sq.json()) > 0

    # 5. History
    res_hist = client.get(f"/api/datasets/{ds_id}/investigation/history")
    assert res_hist.status_code == 200
    assert res_hist.json()["total_messages"] >= 2

    # 6. Reset
    res_reset = client.post(f"/api/datasets/{ds_id}/investigation/reset")
    assert res_reset.status_code == 200

    res_hist_after = client.get(f"/api/datasets/{ds_id}/investigation/history")
    assert res_hist_after.json()["total_messages"] == 0


def test_iot_telemetry_investigation():
    """Domain-independent IoT telemetry dataset investigation test."""
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

    req = InvestigationRequest(
        question="What caused the temperature spike in turbine T-101?",
        mode=InvestigationMode.OVERVIEW,
    )
    resp = investigation_engine.investigate(ds_id, req)
    assert resp.dataset_id == ds_id
    assert len(resp.sources) > 0
    assert "temperature" in resp.answer.lower() or "anomaly" in resp.answer.lower() or "t-101" in resp.answer.lower()

    dataset_store.delete_dataset(ds_id)
    chat_store.reset_history(ds_id)
    investigation_cache.clear(ds_id)


def test_empty_dataset_investigation_handling():
    """Ensure graceful response when a dataset has no anomalies or findings."""
    df = pd.DataFrame({"constant_col": [1, 1, 1, 1, 1]})
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("empty.csv", csv_bytes, "text/csv")},
    )
    assert upload_res.status_code == 201
    ds_id = upload_res.json()["metadata"]["id"]

    req = InvestigationRequest(question="What anomalies exist?")
    resp = investigation_engine.investigate(ds_id, req)
    assert "Insufficient evidence" in resp.answer or "constant_col" in resp.answer

    dataset_store.delete_dataset(ds_id)
