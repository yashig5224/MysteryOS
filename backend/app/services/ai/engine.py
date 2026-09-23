import time
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from app.config import settings
from app.api.schemas.investigation import (
    InvestigationRequest,
    InvestigationResponse,
    InvestigationMessage,
    InvestigationSummary,
    InvestigationSource,
    SuggestedQuestion,
)
from app.services.ai.provider import BaseAIProvider
from app.services.ai.providers.mock_provider import MockProvider
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.providers.gemini_provider import GeminiProvider
from app.services.ai.retriever import StructuredRetriever
from app.services.ai.context_builder import ContextBuilder
from app.services.ai.prompts.investigation import (
    INVESTIGATION_SYSTEM_PROMPT,
    INVESTIGATION_SUMMARY_PROMPT,
    get_mode_prompt_instruction,
)
from app.services.ai.guardrails import InvestigationGuardrails
from app.services.ai.response_parser import ResponseParser
from app.services.ai.chat_store import chat_store
from app.services.ai.cache import investigation_cache


class InvestigationEngine:
    """
    Central AI Investigation Engine.
    Orchestrates Structured RAG retrieval, context budgeting, provider execution,
    guardrails enforcement, hallucination verification, session memory, and caching.
    """

    def __init__(self):
        self.retriever = StructuredRetriever()
        self.context_builder = ContextBuilder(max_chars=8000)
        self._provider: Optional[BaseAIProvider] = None

    def get_provider(self) -> BaseAIProvider:
        """
        Dynamically instantiates or returns the configured AI provider.
        """
        provider_type = (settings.ai_provider or "mock").lower()

        if provider_type == "openai":
            return OpenAIProvider(
                api_key=settings.openai_api_key,
                model_name=settings.openai_model,
            )
        elif provider_type == "gemini":
            return GeminiProvider(
                api_key=settings.gemini_api_key,
                model_name=settings.gemini_model,
            )
        else:
            return MockProvider()

    def investigate(
        self,
        dataset_id: str,
        request: InvestigationRequest,
        force_refresh: bool = False,
    ) -> InvestigationResponse:
        """
        Execute an analytical investigation question against dataset evidence.
        """
        start_time = time.time()
        mode_str = request.mode.value if request.mode else "overview"

        # Check cache
        if not force_refresh:
            cached = investigation_cache.get(
                dataset_id=dataset_id,
                question=request.question,
                thread_id=request.thread_id,
                hypothesis_id=request.hypothesis_id,
                mode=mode_str,
            )
            if cached:
                return cached

        # 1. Retrieve Structured Context
        raw_context = self.retriever.retrieve_context(
            dataset_id=dataset_id,
            question=request.question,
            thread_id=request.thread_id,
            hypothesis_id=request.hypothesis_id,
        )

        # 2. Build Budgeted & Prioritized Context
        budgeted_context = self.context_builder.build_budgeted_context(
            raw_context=raw_context,
            mode=mode_str,
        )

        # 3. Formulate Prompt with Mode Instruction
        mode_instruction = get_mode_prompt_instruction(mode_str)
        custom_system_prompt = f"{INVESTIGATION_SYSTEM_PROMPT}\n\nCURRENT INVESTIGATION MODE INSTRUCTION: {mode_instruction}"

        # 4. Generate AI Provider Response
        provider = self.get_provider()
        try:
            raw_ai_resp = provider.generate_investigation_response(
                question=request.question,
                context=budgeted_context,
                system_prompt=custom_system_prompt,
                mode=mode_str,
            )
        except Exception as e:
            # Fallback to Mock Provider if remote provider fails (e.g. invalid API key or offline network)
            fallback_provider = MockProvider()
            raw_ai_resp = fallback_provider.generate_investigation_response(
                question=request.question,
                context=budgeted_context,
                system_prompt=custom_system_prompt,
                mode=mode_str,
            )
            raw_ai_resp.answer = f"{raw_ai_resp.answer}\n\n*(Note: Generated via Local Fallback Engine due to remote provider status)*"

        # 5. Apply Investigation Guardrails (epistemic modesty, contradiction preservation)
        guarded_answer = InvestigationGuardrails.apply_all(
            answer=raw_ai_resp.answer,
            context=raw_context,
        )

        # 6. Source Validation & Hallucination Protection
        cleaned_answer, validated_sources = ResponseParser.validate_and_enrich_sources(
            answer_text=guarded_answer,
            raw_cited_ids=raw_ai_resp.cited_source_ids,
            raw_context=raw_context,
        )

        # Validate ID lists
        valid_findings = ResponseParser.validate_id_list(raw_ai_resp.related_findings, raw_context)
        valid_hypotheses = ResponseParser.validate_id_list(raw_ai_resp.related_hypotheses, raw_context)
        valid_threads = ResponseParser.validate_id_list(raw_ai_resp.related_threads, raw_context)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        response_id = f"resp_{uuid.uuid4().hex[:8]}"
        created_at = datetime.now(timezone.utc).isoformat()

        response = InvestigationResponse(
            response_id=response_id,
            dataset_id=dataset_id,
            question=request.question,
            answer=cleaned_answer,
            confidence=raw_ai_resp.confidence,
            mode=mode_str,
            sources=validated_sources,
            related_findings=valid_findings,
            related_hypotheses=valid_hypotheses,
            related_threads=valid_threads,
            suggested_questions=raw_ai_resp.suggested_questions,
            created_at=created_at,
            duration_ms=duration_ms,
            provider=provider.provider_name,
            model=provider.model_name,
        )

        # 7. Persist to Session Chat Store
        user_msg = InvestigationMessage(
            message_id=f"msg_{uuid.uuid4().hex[:8]}",
            role="user",
            content=request.question,
            mode=mode_str,
            timestamp=created_at,
        )
        asst_msg = InvestigationMessage(
            message_id=f"msg_{uuid.uuid4().hex[:8]}",
            role="assistant",
            content=cleaned_answer,
            sources=validated_sources,
            suggested_questions=raw_ai_resp.suggested_questions,
            mode=mode_str,
            timestamp=created_at,
        )
        chat_store.append_message(dataset_id, user_msg)
        chat_store.append_message(dataset_id, asst_msg)

        # 8. Cache response
        investigation_cache.set(
            dataset_id=dataset_id,
            question=request.question,
            response=response,
            thread_id=request.thread_id,
            hypothesis_id=request.hypothesis_id,
            mode=mode_str,
        )

        return response

    def generate_investigation_summary(self, dataset_id: str) -> InvestigationSummary:
        """
        Generate executive investigation summary.
        """
        raw_context = self.retriever.retrieve_context(dataset_id=dataset_id)
        budgeted_context = self.context_builder.build_budgeted_context(raw_context, mode="overview")

        provider = self.get_provider()
        try:
            raw_resp = provider.generate_summary(budgeted_context, INVESTIGATION_SUMMARY_PROMPT)
        except Exception:
            fallback = MockProvider()
            raw_resp = fallback.generate_summary(budgeted_context, INVESTIGATION_SUMMARY_PROMPT)

        cleaned_answer, validated_sources = ResponseParser.validate_and_enrich_sources(
            answer_text=raw_resp.answer,
            raw_cited_ids=raw_resp.cited_source_ids,
            raw_context=raw_context,
        )

        hypotheses = raw_context.get("hypotheses", [])
        findings = raw_context.get("findings", [])
        patterns = raw_context.get("patterns", [])
        evidence_items = raw_context.get("evidence", [])
        contradictions = raw_context.get("contradictions", [])
        meta = raw_context.get("dataset_profile", {})

        top_fnd = findings[0] if findings else None
        top_pat = patterns[0] if patterns else None
        top_hyp = hypotheses[0] if hypotheses else None

        return InvestigationSummary(
            dataset_id=dataset_id,
            title=f"Investigation Synopsis: {meta.get('name', dataset_id)}",
            primary_anomaly=top_fnd.get("description") if top_fnd else "No critical anomaly detected",
            important_pattern=top_pat.get("description") if top_pat else "No dominant pattern detected",
            leading_hypothesis=top_hyp.get("statement") if top_hyp else "Exploratory baseline",
            supporting_evidence_count=len(evidence_items) - len(contradictions),
            contradictory_evidence_count=len(contradictions),
            candidate_explanation=top_hyp.get("statement") if top_hyp else "Insufficient evidence for candidate hypothesis",
            confidence=raw_resp.confidence,
            recommended_next_step="Inspect contradictory signals and segment variance to test hypothesis stability.",
            key_sources=validated_sources,
        )

    def get_suggested_questions(self, dataset_id: str) -> List[SuggestedQuestion]:
        """
        Generate domain-independent smart suggested questions derived from actual dataset findings.
        """
        raw_context = self.retriever.retrieve_context(dataset_id=dataset_id)
        findings = raw_context.get("findings", [])
        patterns = raw_context.get("patterns", [])
        hypotheses = raw_context.get("hypotheses", [])
        contradictions = raw_context.get("contradictions", [])
        timeline = raw_context.get("timeline", [])

        questions: List[SuggestedQuestion] = []
        idx = 1

        if findings:
            top_f = findings[0]
            col_name = top_f.get("column", "the primary metric")
            questions.append(
                SuggestedQuestion(
                    question_id=f"sq_{idx}",
                    question=f"What is the most significant anomaly affecting '{col_name}'?",
                    category="anomaly",
                    target_id=top_f.get("id"),
                )
            )
            idx += 1

        if patterns:
            top_p = patterns[0]
            questions.append(
                SuggestedQuestion(
                    question_id=f"sq_{idx}",
                    question=f"What systemic patterns and correlations were discovered?",
                    category="pattern",
                    target_id=top_p.get("id"),
                )
            )
            idx += 1

        if hypotheses:
            top_h = hypotheses[0]
            questions.append(
                SuggestedQuestion(
                    question_id=f"sq_{idx}",
                    question=f"What evidence supports candidate hypothesis [{top_h.get('id')}]?",
                    category="hypothesis",
                    target_id=top_h.get("id"),
                )
            )
            idx += 1

        if contradictions:
            top_c = contradictions[0]
            questions.append(
                SuggestedQuestion(
                    question_id=f"sq_{idx}",
                    question=f"Which evidence contradicts the leading hypothesis?",
                    category="contradiction",
                    target_id=top_c.get("id"),
                )
            )
            idx += 1

        if timeline:
            questions.append(
                SuggestedQuestion(
                    question_id=f"sq_{idx}",
                    question=f"What happened around the major structural change point?",
                    category="timeline",
                    target_id=timeline[0].get("id"),
                )
            )
            idx += 1

        questions.append(
            SuggestedQuestion(
                question_id=f"sq_{idx}",
                question="What should I investigate next to verify this hypothesis?",
                category="next_step",
            )
        )

        return questions

    def get_history(self, dataset_id: str) -> List[InvestigationMessage]:
        return chat_store.get_history(dataset_id)

    def reset_history(self, dataset_id: str) -> bool:
        investigation_cache.clear(dataset_id)
        return chat_store.reset_history(dataset_id)


# Singleton instance
investigation_engine = InvestigationEngine()
