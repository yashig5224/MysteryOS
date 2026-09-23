import json
from typing import Dict, Any, List, Optional


class ContextBuilder:
    """
    Assembles, prioritizes, budgets, and truncates structured investigation context
    to ensure optimal LLM reasoning and prevent context overflow.
    """

    def __init__(self, max_chars: int = 8000):
        self.max_chars = max_chars

    def build_budgeted_context(
        self,
        raw_context: Dict[str, Any],
        mode: str = "overview",
        max_chars: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Build priority-ordered, budgeted context payload.
        Priority:
        1. Active Investigation Thread
        2. Focus / Candidate Hypotheses
        3. Strong Evidence & Contradictory Evidence
        4. Related Patterns
        5. Related Findings (Anomalies)
        6. Timeline Events
        7. Dataset Profile
        """
        limit = max_chars or self.max_chars

        budgeted: Dict[str, Any] = {
            "dataset_profile": raw_context.get("dataset_profile", {}),
            "active_thread": raw_context.get("active_thread"),
            "focus_hypothesis": raw_context.get("focus_hypothesis"),
            "hypotheses": [],
            "evidence": [],
            "contradictions": [],
            "patterns": [],
            "findings": [],
            "timeline": [],
        }

        # 1. Hypotheses: include top 3
        all_hyps = raw_context.get("hypotheses", [])
        budgeted["hypotheses"] = all_hyps[:3]

        # 2. Contradictions: ALWAYS include all contradictions
        contradictions = raw_context.get("contradictions", [])
        budgeted["contradictions"] = contradictions[:5]

        # 3. Evidence: include strong supporting evidence
        all_evd = raw_context.get("evidence", [])
        # Separate non-contradiction evidence
        supporting_evd = [e for e in all_evd if not (e.get("is_contradiction") or e.get("direction") == "contradicts")]
        budgeted["evidence"] = supporting_evd[:6]

        # 4. Patterns: include top 5
        patterns = raw_context.get("patterns", [])
        budgeted["patterns"] = patterns[:5]

        # 5. Findings: include top 6
        findings = raw_context.get("findings", [])
        budgeted["findings"] = findings[:6]

        # 6. Timeline: include top 5
        timeline = raw_context.get("timeline", [])
        budgeted["timeline"] = timeline[:5]

        # Check total JSON size and trim if necessary
        serialized = json.dumps(budgeted)
        if len(serialized) > limit:
            # Stepwise truncation of lower priority items
            budgeted["findings"] = findings[:3]
            budgeted["patterns"] = patterns[:3]
            budgeted["timeline"] = timeline[:3]
            budgeted["evidence"] = supporting_evd[:4]

            # Recheck
            if len(json.dumps(budgeted)) > limit:
                budgeted["findings"] = findings[:2]
                budgeted["patterns"] = patterns[:2]
                budgeted["timeline"] = timeline[:2]
                budgeted["evidence"] = supporting_evd[:2]

        return budgeted
