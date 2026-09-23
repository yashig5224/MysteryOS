import re
from typing import Dict, Any, List, Optional
from app.services.ai.provider import BaseAIProvider, AIProviderRawResponse


class MockProvider(BaseAIProvider):
    """
    Deterministic AI Provider for local testing, offline development, and unit test suites.
    Generates structured, source-grounded reasoning without external network dependencies.
    """

    def __init__(self, model_name: str = "mock-investigator-v1"):
        self._model_name = model_name

    @property
    def provider_name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return self._model_name

    def generate_investigation_response(
        self,
        question: str,
        context: Dict[str, Any],
        system_prompt: str,
        mode: str = "overview",
    ) -> AIProviderRawResponse:
        """
        Generate deterministic, analytical reasoning using the provided structured context.
        """
        # 1. Extract context components
        active_thread = context.get("active_thread")
        hypotheses = context.get("hypotheses", [])
        evidence_items = context.get("evidence", [])
        patterns = context.get("patterns", [])
        findings = context.get("findings", [])
        timeline = context.get("timeline", [])
        contradictions = context.get("contradictions", [])
        dataset_meta = context.get("dataset_profile", {})

        dataset_name = dataset_meta.get("name", "Target Dataset")
        total_rows = dataset_meta.get("row_count", 0)

        # Check if context is completely empty
        if not hypotheses and not evidence_items and not patterns and not findings:
            return AIProviderRawResponse(
                answer="Insufficient evidence in the current investigation. No statistical anomalies, patterns, or candidate hypotheses have been detected for this dataset.",
                confidence="low",
                cited_source_ids=[],
                suggested_questions=[
                    "What data is present in this dataset?",
                    "Are there missing values or data quality issues?",
                ],
            )

        q_lower = question.lower()
        cited_ids: List[str] = []
        related_hypotheses: List[str] = []
        related_findings: List[str] = []
        related_threads: List[str] = []
        suggested_questions: List[str] = []

        # Find leading items
        leading_hyp = hypotheses[0] if hypotheses else None
        top_evidence = evidence_items[0] if evidence_items else None
        top_finding = findings[0] if findings else None
        top_pattern = patterns[0] if patterns else None
        top_contra = contradictions[0] if contradictions else None

        # Build answer based on question intent or mode
        if mode == "anomaly" or "anomaly" in q_lower or "outlier" in q_lower:
            if top_finding:
                cited_ids.append(top_finding["id"])
                related_findings.append(top_finding["id"])
                answer = (
                    f"The primary anomaly identified in the investigation is [{top_finding['id']}] affecting "
                    f"column '{top_finding.get('column', 'target')}'. "
                    f"The data shows a severity level of {top_finding.get('severity', 'moderate').upper()} with an anomaly score of "
                    f"{top_finding.get('score', 0)}/100. {top_finding.get('description', '')}. "
                )
                if top_pattern:
                    cited_ids.append(top_pattern["id"])
                    answer += f"This anomaly is structurally linked to pattern [{top_pattern['id']}], where {top_pattern.get('description', '')}."
            else:
                answer = "Insufficient evidence in the current investigation regarding specific anomalies."

        elif mode == "pattern" or "pattern" in q_lower or "correlation" in q_lower or "trend" in q_lower or "relationship" in q_lower:
            if top_pattern:
                cited_ids.append(top_pattern["id"])
                answer = (
                    f"Pattern analysis identified [{top_pattern['id']}] ({top_pattern.get('type', 'pattern').upper()}). "
                    f"{top_pattern.get('description', '')}. "
                    f"The statistical confidence score is {top_pattern.get('confidence', 0)}/100. "
                )
                if len(patterns) > 1:
                    second_pattern = patterns[1]
                    cited_ids.append(second_pattern["id"])
                    answer += f"Additionally, pattern [{second_pattern['id']}] shows {second_pattern.get('description', '')}."
            else:
                answer = "Insufficient evidence in the current investigation regarding systemic patterns."

        elif mode == "hypothesis" or "hypothes" in q_lower or "explain" in q_lower or "why" in q_lower:
            if leading_hyp:
                cited_ids.append(leading_hyp["id"])
                related_hypotheses.append(leading_hyp["id"])
                answer = (
                    f"The leading candidate hypothesis [{leading_hyp['id']}] states: '{leading_hyp.get('statement', '')}'. "
                    f"The analytical plausibility score is {leading_hyp.get('plausibility_score', 0)}/100 ({leading_hyp.get('status', 'candidate')}). "
                )
                # Supporting evidence
                if top_evidence:
                    cited_ids.append(top_evidence["id"])
                    answer += f"Strong supporting evidence includes [{top_evidence['id']}], which notes: {top_evidence.get('observation', '')}. "
                # Contradictory evidence
                if top_contra:
                    cited_ids.append(top_contra["id"])
                    answer += (
                        f"However, contradictory evidence [{top_contra['id']}] was detected: {top_contra.get('observation', '')}. "
                        f"This suggests the hypothesis should not be treated as a confirmed fact without further segment isolation."
                    )
            else:
                answer = "Insufficient evidence in the current investigation to formulate a conclusive hypothesis."

        elif mode == "evidence" or "evidence" in q_lower or "support" in q_lower or "contradict" in q_lower:
            if top_evidence:
                cited_ids.append(top_evidence["id"])
                answer = (
                    f"Investigation evidence reveals [{top_evidence['id']}] with strength {top_evidence.get('strength', 0)}/100. "
                    f"Observation: {top_evidence.get('observation', '')}. "
                )
                if top_contra:
                    cited_ids.append(top_contra["id"])
                    answer += (
                        f"Crucially, contradictory evidence [{top_contra['id']}] is present: "
                        f"{top_contra.get('observation', '')}, indicating potential confounding variables or non-linear effects."
                    )
            else:
                answer = "Insufficient evidence in the current investigation."

        elif mode == "timeline" or "timeline" in q_lower or "before" in q_lower or "after" in q_lower or "when" in q_lower:
            if timeline:
                first_evt = timeline[0]
                cited_ids.append(first_evt["id"])
                answer = (
                    f"Chronological analysis indicates event [{first_evt['id']}] occurred at {first_evt.get('timestamp', 'the recorded window')}: "
                    f"{first_evt.get('description', '')}. "
                )
                if len(timeline) > 1:
                    last_evt = timeline[-1]
                    cited_ids.append(last_evt["id"])
                    answer += f"This was followed by event [{last_evt['id']}]: {last_evt.get('description', '')}."
            else:
                answer = "Insufficient timeline evidence in the current investigation."

        elif mode == "next_step" or "next" in q_lower or "should i" in q_lower or "recommend" in q_lower:
            target_col = top_finding.get("column", "the primary metric") if top_finding else "the identified variables"
            answer = (
                f"Based on available analytical signals, the recommended next investigation step is to isolate and segment data along '{target_col}'. "
            )
            if top_contra:
                cited_ids.append(top_contra["id"])
                answer += f"Specifically, investigate contradictory signal [{top_contra['id']}] to determine if regional, operational, or categorical subsets account for the variance."
            elif leading_hyp:
                cited_ids.append(leading_hyp["id"])
                answer += f"Cross-verify candidate hypothesis [{leading_hyp['id']}] by checking if external confounding factors or secondary attributes drive the observed behavior."

        elif mode == "thread" or "thread" in q_lower:
            if active_thread:
                cited_ids.append(active_thread["id"])
                related_threads.append(active_thread["id"])
                answer = (
                    f"Investigation Thread [{active_thread['id']}] ('{active_thread.get('title', 'Primary Thread')}') "
                    f"has an analytical priority of {active_thread.get('priority', 0)}/100. "
                    f"It unites {len(active_thread.get('evidence_ids', []))} evidence item(s) and candidate hypothesis [{active_thread.get('primary_hypothesis_id', 'N/A')}]."
                )
            else:
                answer = "No active investigation thread selected. All discovered evidence items are linked to the general dataset investigation."

        else:
            # General Overview / Assistant response
            answer_parts = []
            if active_thread:
                cited_ids.append(active_thread["id"])
                related_threads.append(active_thread["id"])
                answer_parts.append(f"Investigation focus: [{active_thread['id']}] '{active_thread.get('title', 'Active Thread')}'.")

            if top_finding:
                cited_ids.append(top_finding["id"])
                related_findings.append(top_finding["id"])
                answer_parts.append(f"The data shows a key signal in [{top_finding['id']}]: {top_finding.get('description', '')}.")

            if leading_hyp:
                cited_ids.append(leading_hyp["id"])
                related_hypotheses.append(leading_hyp["id"])
                answer_parts.append(f"The evidence is consistent with candidate hypothesis [{leading_hyp['id']}]: '{leading_hyp.get('statement', '')}'.")

            if top_contra:
                cited_ids.append(top_contra["id"])
                answer_parts.append(f"Note that contradictory evidence [{top_contra['id']}] remains present: {top_contra.get('observation', '')}.")

            if not answer_parts:
                answer = f"The dataset '{dataset_name}' contains {total_rows} records. Analytical exploration is ready."
            else:
                answer = " ".join(answer_parts)

        # Dynamic Suggested Questions
        if top_finding:
            suggested_questions.append(f"Why is anomaly {top_finding['id']} significant?")
        if leading_hyp:
            suggested_questions.append("What evidence contradicts the leading hypothesis?")
        if timeline:
            suggested_questions.append("What is the chronological sequence of events?")
        suggested_questions.append("What should I investigate next?")

        # Deduplicate cited IDs
        seen_ids = set()
        deduped_ids = []
        for cid in cited_ids:
            if cid not in seen_ids:
                seen_ids.add(cid)
                deduped_ids.append(cid)

        return AIProviderRawResponse(
            answer=answer,
            confidence="moderate" if top_evidence else "low",
            cited_source_ids=deduped_ids,
            related_findings=related_findings,
            related_hypotheses=related_hypotheses,
            related_threads=related_threads,
            suggested_questions=suggested_questions[:4],
            raw_metadata={"provider": "mock", "mode": mode},
        )

    def generate_summary(
        self,
        context: Dict[str, Any],
        system_prompt: str,
    ) -> AIProviderRawResponse:
        """
        Generate executive investigation summary.
        """
        hypotheses = context.get("hypotheses", [])
        evidence_items = context.get("evidence", [])
        patterns = context.get("patterns", [])
        findings = context.get("findings", [])
        contradictions = context.get("contradictions", [])
        dataset_meta = context.get("dataset_profile", {})

        dataset_name = dataset_meta.get("name", "Dataset Investigation")
        leading_hyp = hypotheses[0] if hypotheses else None
        top_finding = findings[0] if findings else None
        top_pattern = patterns[0] if patterns else None
        top_contra = contradictions[0] if contradictions else None

        cited_ids = []
        if top_finding:
            cited_ids.append(top_finding["id"])
        if top_pattern:
            cited_ids.append(top_pattern["id"])
        if leading_hyp:
            cited_ids.append(leading_hyp["id"])
        if top_contra:
            cited_ids.append(top_contra["id"])

        pri_anomaly = top_finding.get("description", "No critical anomalies") if top_finding else "No critical anomalies detected"
        imp_pattern = top_pattern.get("description", "No systemic patterns") if top_pattern else "Standard statistical distribution"
        cand_exp = leading_hyp.get("statement", "Insufficient evidence for candidate hypothesis") if leading_hyp else "Exploratory baseline"

        summary_text = (
            f"### INVESTIGATION SUMMARY\n\n"
            f"**Dataset**: {dataset_name}\n\n"
            f"**Primary Signal**: {pri_anomaly}\n\n"
            f"**Key Pattern**: {imp_pattern}\n\n"
            f"**Evidence Base**: {len(evidence_items)} supporting item(s), {len(contradictions)} contradictory item(s).\n\n"
            f"**Candidate Hypothesis**: {cand_exp}.\n\n"
            f"**Confidence**: Moderate (analytical plausibility grounded in detected signals).\n\n"
            f"**Recommended Next Step**: Inspect contradictory signals and segment variance to test hypothesis stability."
        )

        return AIProviderRawResponse(
            answer=summary_text,
            confidence="moderate",
            cited_source_ids=cited_ids,
            related_findings=[top_finding["id"]] if top_finding else [],
            related_hypotheses=[leading_hyp["id"]] if leading_hyp else [],
            suggested_questions=[
                "What is the most important anomaly?",
                "Is there contradictory evidence?",
                "What should I investigate next?",
            ],
            raw_metadata={"type": "summary", "dataset_id": dataset_meta.get("id", "")},
        )
