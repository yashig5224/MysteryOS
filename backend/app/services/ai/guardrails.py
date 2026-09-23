import re
from typing import Dict, Any, List


CAUSALITY_REPLACEMENTS = [
    (r"\bthis proves that\b", "the evidence suggests that"),
    (r"\bthis proves\b", "this indicates"),
    (r"\bproves that\b", "suggests that"),
    (r"\bdefinitely caused\b", "is strongly associated with"),
    (r"\bdefinitely causes\b", "may lead to"),
    (r"\bthe root cause is\b", "a key contributing factor appears to be"),
    (r"\bthe direct cause of\b", "a primary correlated factor in"),
    (r"\bconclusively demonstrates\b", "provides strong empirical support that"),
    (r"\bwe have proven\b", "the analysis indicates"),
]


class InvestigationGuardrails:
    """
    Enforces epistemological caution, uncertainty preservation, and anti-hallucination guardrails.
    """

    @staticmethod
    def sanitize_causal_language(text: str) -> str:
        """
        Softens unproven causal assertions into probabilistic, evidence-grounded statements.
        """
        sanitized = text
        for pattern, replacement in CAUSALITY_REPLACEMENTS:
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
        return sanitized

    @staticmethod
    def check_contradiction_awareness(
        answer: str,
        context: Dict[str, Any],
    ) -> str:
        """
        Ensures contradictory evidence is not suppressed when present in context.
        If contradictory evidence exists but the response makes a high-certainty claim without caveat,
        appends a clarifying note.
        """
        contradictions = context.get("contradictions", [])
        if not contradictions:
            return answer

        contra_terms = ["contradict", "counter", "however", "caveat", "discrepan", "inconsistent", "exception"]
        has_contra_mention = any(term in answer.lower() for term in contra_terms)

        if not has_contra_mention and len(contradictions) > 0:
            top_contra = contradictions[0]
            contra_id = top_contra.get("id", "contradiction")
            contra_obs = top_contra.get("observation", "counter-evidence detected")
            caveat = f"\n\n> **Investigative Caveat**: Contradictory evidence [{contra_id}] remains present ({contra_obs}). Conclusions should be verified across subgroups before taking action."
            return answer + caveat

        return answer

    @staticmethod
    def apply_all(answer: str, context: Dict[str, Any]) -> str:
        """
        Apply full guardrail pipeline.
        """
        text = InvestigationGuardrails.sanitize_causal_language(answer)
        text = InvestigationGuardrails.check_contradiction_awareness(text, context)
        return text
