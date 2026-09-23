import re
from typing import Dict, Any, List, Set, Tuple
from app.api.schemas.investigation import InvestigationSource


class ResponseParser:
    """
    Parses LLM output and executes strict hallucination protection and source validation.
    Cross-validates all referenced source IDs against actual dataset analytical artifacts.
    """

    @staticmethod
    def extract_valid_entity_map(raw_context: Dict[str, Any]) -> Dict[str, InvestigationSource]:
        """
        Build an index of all valid, existing entities in the dataset for cross-validation.
        Key is normalized lowercase ID (e.g. 'evd_001', 'pat_002', 'fnd_003', 'hyp_001', 'thread_001', 'evt_001').
        """
        valid_map: Dict[str, InvestigationSource] = {}

        # 1. Evidence
        for e in raw_context.get("evidence", []) + raw_context.get("contradictions", []):
            eid = e.get("id", "")
            if eid:
                valid_map[eid.lower()] = InvestigationSource(
                    type="evidence",
                    id=eid,
                    title=f"Evidence: {e.get('direction', 'support').upper()}",
                    description=e.get("observation") or e.get("claim", ""),
                    strength=e.get("strength"),
                )

        # 2. Patterns
        for p in raw_context.get("patterns", []):
            pid = p.get("id", "")
            if pid:
                valid_map[pid.lower()] = InvestigationSource(
                    type="pattern",
                    id=pid,
                    title=p.get("title") or f"Pattern: {p.get('type', '').upper()}",
                    description=p.get("description", ""),
                    strength=p.get("confidence"),
                )

        # 3. Findings
        for f in raw_context.get("findings", []):
            fid = f.get("id", "")
            if fid:
                valid_map[fid.lower()] = InvestigationSource(
                    type="finding",
                    id=fid,
                    title=f"Finding: {f.get('column', '')} ({f.get('severity', '').upper()})",
                    description=f.get("description", ""),
                    strength=f.get("score"),
                )

        # 4. Hypotheses
        for h in raw_context.get("hypotheses", []):
            hid = h.get("id", "")
            if hid:
                valid_map[hid.lower()] = InvestigationSource(
                    type="hypothesis",
                    id=hid,
                    title=h.get("title") or "Candidate Hypothesis",
                    description=h.get("statement", ""),
                    strength=h.get("plausibility_score"),
                )

        # 5. Threads
        for t in raw_context.get("threads", []):
            tid = t.get("id", "")
            if tid:
                valid_map[tid.lower()] = InvestigationSource(
                    type="thread",
                    id=tid,
                    title=t.get("title") or "Investigation Thread",
                    description=f"Priority {t.get('priority', 0)} thread",
                    strength=t.get("priority"),
                )

        # 6. Timeline
        for ev in raw_context.get("timeline", []):
            evid = ev.get("id", "")
            if evid:
                valid_map[evid.lower()] = InvestigationSource(
                    type="timeline",
                    id=evid,
                    title=ev.get("title") or "Timeline Event",
                    description=ev.get("description", ""),
                    strength=ev.get("impact_score"),
                )

        return valid_map

    @classmethod
    def validate_and_enrich_sources(
        cls,
        answer_text: str,
        raw_cited_ids: List[str],
        raw_context: Dict[str, Any],
    ) -> Tuple[str, List[InvestigationSource]]:
        """
        1. Identifies all entity IDs mentioned in answer text and raw_cited_ids.
        2. Validates against existing entity map.
        3. Prunes non-existent/hallucinated IDs.
        4. Normalizes bracketed IDs in answer text.
        """
        valid_map = cls.extract_valid_entity_map(raw_context)

        # Find all candidate IDs in answer text (e.g. [EVD-001], [evd_001], EVD_001, etc.)
        pattern = r"\[?([a-zA-Z]{2,6}[-_]\d{1,5})\]?"
        text_matches = re.findall(pattern, answer_text)

        all_candidates = list(raw_cited_ids) + text_matches

        validated_sources: List[InvestigationSource] = []
        seen_keys: Set[str] = set()

        for cand in all_candidates:
            # Normalize key (e.g. EVD-001 -> evd_001, EVD_001 -> evd_001)
            norm_key = cand.lower().replace("-", "_")
            if norm_key in valid_map and norm_key not in seen_keys:
                seen_keys.add(norm_key)
                validated_sources.append(valid_map[norm_key])

        # Remove hallucinated bracket references from answer text
        def replace_bracket(match):
            cid = match.group(1)
            norm_cid = cid.lower().replace("-", "_")
            if norm_cid in valid_map:
                # Keep real source citation in canonical uppercase/standard format
                return f"[{valid_map[norm_cid].id}]"
            else:
                # Remove or un-bracket hallucinated tag
                return f"(unverified citation)"

        cleaned_text = re.sub(r"\[([a-zA-Z]{2,6}[-_]\d{1,5})\]", replace_bracket, answer_text)

        return cleaned_text, validated_sources

    @classmethod
    def validate_id_list(cls, ids: List[str], raw_context: Dict[str, Any]) -> List[str]:
        valid_map = cls.extract_valid_entity_map(raw_context)
        valid_ids = []
        for i in ids:
            norm_i = i.lower().replace("-", "_")
            if norm_i in valid_map:
                valid_ids.append(valid_map[norm_i].id)
        return valid_ids
