import uuid
from typing import List, Optional
import pandas as pd

from app.api.schemas.evidence import Hypothesis, Evidence, EvidencePolarity
from app.api.schemas.patterns import Pattern, Relationship, TimelineEvent, CorrelationPair
from app.api.schemas.analysis import AnalysisFinding
from app.services.evidence.evidence_scorer import calculate_hypothesis_confidence


def generate_candidate_hypotheses(
    dataset_id: str,
    evidence_items: List[Evidence],
    patterns: List[Pattern],
    relationships: List[Relationship],
    timeline: List[TimelineEvent],
    correlations: List[CorrelationPair],
    contradictions: List[Evidence],
) -> List[Hypothesis]:
    """
    Generate deterministic, explainable candidate hypotheses linking empirical evidence, patterns, and timelines.
    """
    hypotheses: List[Hypothesis] = []
    seen_hyp_keys = set()

    # 1. Temporal Precedence Hypotheses (OCCURS_BEFORE)
    for rel in relationships:
        if rel.relationship_type == "OCCURS_BEFORE":
            key = ("temporal_precedence", rel.source, rel.target)
            if key not in seen_hyp_keys:
                seen_hyp_keys.add(key)

                # Match supporting evidence
                supporting_evd = [e.evidence_id for e in evidence_items if e.polarity == EvidencePolarity.SUPPORT.value and set(e.columns).intersection(set(rel.source.split() + rel.target.split()))]
                contradicting_evd = [c.evidence_id for c in contradictions]

                confidence = calculate_hypothesis_confidence(
                    evidence_strength=rel.strength,
                    supporting_count=len(supporting_evd) + 1,
                    contradicting_count=len(contradicting_evd),
                    has_temporal_link=True,
                )

                h = Hypothesis(
                    hypothesis_id=f"hyp_temp_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Temporal Transition Association: {rel.source} &rarr; {rel.target}",
                    statement=(
                        f"Candidate explanation: The shift observed in '{rel.source}' occurred prior to '{rel.target}', "
                        f"suggesting a possible chronological progression or downstream operational response."
                    ),
                    status="candidate",
                    confidence=confidence,
                    evidence_strength=rel.strength,
                    supporting_evidence_ids=supporting_evd[:5],
                    contradicting_evidence_ids=contradicting_evd[:3],
                    supporting_pattern_ids=rel.supporting_pattern_ids,
                    related_relationship_ids=[rel.relationship_id],
                    timeline_event_ids=[],
                    reasoning=(
                        f"Observed chronological order indicates '{rel.source}' preceded '{rel.target}'. "
                        f"While temporal precedence does not establish causality, the sequence represents a prominent investigative lead."
                    ),
                    primary_columns=[],
                )
                hypotheses.append(h)

    # 2. Co-Movement & Correlation Hypotheses
    for corr in correlations:
        if abs(corr.coefficient) >= 0.70:
            key = ("correlation", tuple(sorted([corr.var1, corr.var2])))
            if key not in seen_hyp_keys:
                seen_hyp_keys.add(key)

                matching_evd = [
                    e.evidence_id for e in evidence_items
                    if e.polarity == EvidencePolarity.SUPPORT.value and {corr.var1, corr.var2}.intersection(set(e.columns))
                ]
                contradicting_evd = [c.evidence_id for c in contradictions if {corr.var1, corr.var2}.intersection(set(c.columns))]

                base_str = int(round(abs(corr.coefficient) * 100))
                confidence = calculate_hypothesis_confidence(
                    evidence_strength=base_str,
                    supporting_count=len(matching_evd),
                    contradicting_count=len(contradicting_evd),
                )

                dir_word = "positive" if corr.coefficient > 0 else "inverse"
                h = Hypothesis(
                    hypothesis_id=f"hyp_corr_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Systemic Coupling between '{corr.var1}' & '{corr.var2}'",
                    statement=(
                        f"Candidate explanation: A strong {dir_word} linear association (r = {corr.coefficient:+.2f}) suggests "
                        f"that '{corr.var1}' and '{corr.var2}' share common driving mechanisms or feedback loops."
                    ),
                    status="candidate",
                    confidence=confidence,
                    evidence_strength=base_str,
                    supporting_evidence_ids=matching_evd[:5],
                    contradicting_evidence_ids=contradicting_evd[:3],
                    supporting_pattern_ids=[p.pattern_id for p in patterns if {corr.var1, corr.var2}.issubset(set(p.columns))],
                    related_relationship_ids=[r.relationship_id for r in relationships if {corr.var1, corr.var2} == {r.source, r.target}],
                    timeline_event_ids=[],
                    reasoning=(
                        f"Statistical analysis established high linear alignment (N={corr.sample_size:,}). "
                        f"The variables systematically move in tandem across the dataset."
                    ),
                    primary_columns=[corr.var1, corr.var2],
                )
                hypotheses.append(h)

    # 3. Segment Disparity Hypotheses
    for pat in patterns:
        if pat.type == "group_difference" and "category_column" in pat.metadata:
            cat_col = pat.metadata["category_column"]
            metric_col = pat.metadata["metric_column"]
            key = ("group_difference", cat_col, metric_col)
            if key not in seen_hyp_keys:
                seen_hyp_keys.add(key)

                matching_evd = [
                    e.evidence_id for e in evidence_items
                    if e.polarity == EvidencePolarity.SUPPORT.value and set(e.columns).intersection({cat_col, metric_col})
                ]
                contradicting_evd = [
                    c.evidence_id for c in contradictions
                    if set(c.columns).intersection({cat_col, metric_col})
                ]

                confidence = calculate_hypothesis_confidence(
                    evidence_strength=pat.strength,
                    supporting_count=len(matching_evd),
                    contradicting_count=len(contradicting_evd),
                )

                h = Hypothesis(
                    hypothesis_id=f"hyp_grp_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Segment-Level Variance Driver: '{cat_col}' &rarr; '{metric_col}'",
                    statement=(
                        f"Candidate explanation: Structural differences between '{cat_col}' categories "
                        f"may explain the substantial disparity ({pat.metadata.get('disparity_percentage', 0):.1f}%) in '{metric_col}'."
                    ),
                    status="candidate",
                    confidence=confidence,
                    evidence_strength=pat.strength,
                    supporting_evidence_ids=matching_evd[:5],
                    contradicting_evidence_ids=contradicting_evd[:3],
                    supporting_pattern_ids=[pat.pattern_id],
                    related_relationship_ids=[],
                    timeline_event_ids=[],
                    reasoning=(
                        f"Grouping analysis demonstrated significant divergence across categorical segments. "
                        f"Segmental factors (such as regional or operational differences) appear directly associated with outcomes."
                    ),
                    primary_columns=[cat_col, metric_col],
                )
                hypotheses.append(h)

    # 4. Structural Shift / Change Point Hypotheses
    for pat in patterns:
        if pat.type == "change_point":
            metric_col = pat.metadata.get("shifted_column") or (pat.columns[0] if pat.columns else "metric")
            key = ("change_point", metric_col)
            if key not in seen_hyp_keys:
                seen_hyp_keys.add(key)

                matching_evd = [
                    e.evidence_id for e in evidence_items
                    if e.polarity == EvidencePolarity.SUPPORT.value and metric_col in e.columns
                ]
                contradicting_evd = [
                    c.evidence_id for c in contradictions
                    if metric_col in c.columns
                ]

                confidence = calculate_hypothesis_confidence(
                    evidence_strength=pat.strength,
                    supporting_count=len(matching_evd),
                    contradicting_count=len(contradicting_evd),
                    has_temporal_link=True,
                )

                shift_pct = pat.metadata.get("shift_percentage", 0)
                date_str = str(pat.metadata.get("change_point_date", "transition period"))[:10]
                dir_desc = "upward inflection" if shift_pct > 0 else "downward contraction"

                h = Hypothesis(
                    hypothesis_id=f"hyp_shift_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Structural Baseline Shift in '{metric_col}' ({date_str})",
                    statement=(
                        f"Candidate explanation: '{metric_col}' experienced a sudden {dir_desc} ({abs(shift_pct):.1f}%) "
                        f"starting around {date_str}, consistent with a discrete external intervention, policy change, or systemic disruption."
                    ),
                    status="candidate",
                    confidence=confidence,
                    evidence_strength=pat.strength,
                    supporting_evidence_ids=matching_evd[:5],
                    contradicting_evidence_ids=contradicting_evd[:3],
                    supporting_pattern_ids=[pat.pattern_id],
                    related_relationship_ids=[],
                    timeline_event_ids=[],
                    reasoning=(
                        f"Statistical change-point detection identified a significant mean shift ({abs(shift_pct):.1f}%) "
                        f"that persisted after {date_str}, distinguishing it from random transient noise."
                    ),
                    primary_columns=[metric_col],
                )
                hypotheses.append(h)

    # 5. Persistent Trend Hypotheses
    for pat in patterns:
        if pat.type == "trend":
            metric_col = pat.columns[0] if pat.columns else "metric"
            key = ("trend", metric_col)
            if key not in seen_hyp_keys:
                seen_hyp_keys.add(key)

                matching_evd = [
                    e.evidence_id for e in evidence_items
                    if e.polarity == EvidencePolarity.SUPPORT.value and metric_col in e.columns
                ]
                contradicting_evd = [
                    c.evidence_id for c in contradictions
                    if metric_col in c.columns
                ]

                confidence = calculate_hypothesis_confidence(
                    evidence_strength=pat.strength,
                    supporting_count=len(matching_evd),
                    contradicting_count=len(contradicting_evd),
                    has_temporal_link=True,
                )

                direction = pat.direction or "directional"
                h = Hypothesis(
                    hypothesis_id=f"hyp_trnd_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Persistent {direction.capitalize()} Trajectory in '{metric_col}'",
                    statement=(
                        f"Candidate explanation: Sustained {direction} momentum in '{metric_col}' "
                        f"indicates cumulative underlying systemic pressure or continuous compounding growth."
                    ),
                    status="candidate",
                    confidence=confidence,
                    evidence_strength=pat.strength,
                    supporting_evidence_ids=matching_evd[:5],
                    contradicting_evidence_ids=contradicting_evd[:3],
                    supporting_pattern_ids=[pat.pattern_id],
                    related_relationship_ids=[],
                    timeline_event_ids=[],
                    reasoning=(
                        f"Linear regression and Mann-Kendall trend tests confirmed a statistically significant {direction} slope."
                    ),
                    primary_columns=[metric_col],
                )
                hypotheses.append(h)

    hypotheses.sort(key=lambda x: x.confidence, reverse=True)
    return hypotheses
