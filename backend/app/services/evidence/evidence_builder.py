import uuid
from typing import List, Optional
import pandas as pd

from app.api.schemas.evidence import Evidence, EvidenceType, EvidencePolarity
from app.api.schemas.patterns import Pattern, Relationship, TimelineEvent, CorrelationPair
from app.api.schemas.analysis import AnalysisFinding
from app.services.evidence.evidence_scorer import calculate_evidence_strength


def build_evidence_items(
    dataset_id: str,
    findings: List[AnalysisFinding],
    patterns: List[Pattern],
    relationships: List[Relationship],
    timeline: List[TimelineEvent],
    correlations: List[CorrelationPair],
) -> List[Evidence]:
    """
    Construct standardized, traceable evidence items from empirical findings, patterns, relationships, and events.
    """
    evidence_items: List[Evidence] = []
    seen_keys = set()

    # 1. Evidence from Correlation Patterns & Pairs
    for corr in correlations:
        key = (corr.var1, corr.var2, "correlation")
        if key not in seen_keys:
            seen_keys.add(key)
            strength = calculate_evidence_strength(
                base_magnitude=abs(corr.coefficient),
                sample_size=corr.sample_size,
                signal_count=2,
            )

            # Find matching patterns and findings
            matching_patterns = [p.pattern_id for p in patterns if set(p.columns).issubset({corr.var1, corr.var2})]
            matching_findings = [f.finding_id for f in findings if f.column in {corr.var1, corr.var2}]
            matching_rels = [r.relationship_id for r in relationships if {r.source, r.target} == {corr.var1, corr.var2}]

            evd = Evidence(
                evidence_id=f"evd_corr_{uuid.uuid4().hex[:8]}",
                dataset_id=dataset_id,
                title=f"Statistical Co-Movement: '{corr.var1}' & '{corr.var2}' (r = {corr.coefficient:+.2f})",
                description=(
                    f"Empirical evaluation confirmed a {corr.strength} {corr.direction} linear association between '{corr.var1}' and '{corr.var2}' "
                    f"(Pearson r = {corr.coefficient:+.2f}, N = {corr.sample_size:,})."
                ),
                evidence_type=EvidenceType.CORRELATION_EVIDENCE.value,
                strength=strength,
                polarity=EvidencePolarity.SUPPORT.value,
                supports_pattern_ids=matching_patterns,
                related_finding_ids=matching_findings[:5],
                related_relationship_ids=matching_rels[:2],
                columns=[corr.var1, corr.var2],
                source_metadata={"coefficient": corr.coefficient, "method": corr.method, "sample_size": corr.sample_size},
            )
            evidence_items.append(evd)

    # 2. Evidence from Trend Patterns
    for pat in patterns:
        if pat.type == "trend":
            key = (str(pat.columns), "trend", pat.pattern_id)
            if key not in seen_keys:
                seen_keys.add(key)
                strength = pat.strength
                evd = Evidence(
                    evidence_id=f"evd_trd_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Empirical Trend Trajectory: {pat.title}",
                    description=pat.description,
                    evidence_type=EvidenceType.TREND_EVIDENCE.value,
                    strength=strength,
                    polarity=EvidencePolarity.SUPPORT.value,
                    supports_pattern_ids=[pat.pattern_id],
                    related_finding_ids=pat.supporting_finding_ids,
                    columns=pat.columns,
                    source_metadata=pat.metadata,
                )
                evidence_items.append(evd)

        elif pat.type == "group_difference":
            key = (str(pat.columns), "group", pat.pattern_id)
            if key not in seen_keys:
                seen_keys.add(key)
                evd = Evidence(
                    evidence_id=f"evd_grp_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Segmental Disparity: {pat.title}",
                    description=pat.description,
                    evidence_type=EvidenceType.GROUP_DIFFERENCE_EVIDENCE.value,
                    strength=pat.strength,
                    polarity=EvidencePolarity.SUPPORT.value,
                    supports_pattern_ids=[pat.pattern_id],
                    related_finding_ids=pat.supporting_finding_ids,
                    columns=pat.columns,
                    source_metadata=pat.metadata,
                )
                evidence_items.append(evd)

        elif pat.type == "change_point":
            key = (str(pat.columns), "change_point", pat.pattern_id)
            if key not in seen_keys:
                seen_keys.add(key)
                evd = Evidence(
                    evidence_id=f"evd_cp_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Structural Transition Point: {pat.title}",
                    description=pat.description,
                    evidence_type=EvidenceType.CHANGE_POINT_EVIDENCE.value,
                    strength=pat.strength,
                    polarity=EvidencePolarity.SUPPORT.value,
                    supports_pattern_ids=[pat.pattern_id],
                    related_finding_ids=pat.supporting_finding_ids,
                    columns=pat.columns,
                    source_metadata=pat.metadata,
                )
                evidence_items.append(evd)

    # 3. Evidence from Temporal Precedence Relationships
    for rel in relationships:
        if rel.relationship_type == "OCCURS_BEFORE":
            key = (rel.source, rel.target, "occurs_before")
            if key not in seen_keys:
                seen_keys.add(key)
                strength = rel.strength
                evd = Evidence(
                    evidence_id=f"evd_temp_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"Chronological Precedence: {rel.source} preceded {rel.target}",
                    description=rel.description,
                    evidence_type=EvidenceType.TEMPORAL_EVIDENCE.value,
                    strength=strength,
                    polarity=EvidencePolarity.SUPPORT.value,
                    supports_pattern_ids=rel.supporting_pattern_ids,
                    related_finding_ids=rel.supporting_finding_ids,
                    related_relationship_ids=[rel.relationship_id],
                    columns=[],
                    source_metadata=rel.metadata,
                )
                evidence_items.append(evd)

    # 4. Evidence from High-Severity Anomalies
    for f in findings:
        if f.severity == "high" or f.score >= 80:
            key = (f.column, f.row_reference, "anomaly", f.finding_id)
            if key not in seen_keys:
                seen_keys.add(key)
                strength = f.score
                evd = Evidence(
                    evidence_id=f"evd_anom_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    title=f"High-Severity Anomaly: {f.title}",
                    description=f.description,
                    evidence_type=EvidenceType.ANOMALY_EVIDENCE.value,
                    strength=strength,
                    polarity=EvidencePolarity.SUPPORT.value,
                    supports_pattern_ids=[],
                    related_finding_ids=[f.finding_id],
                    columns=[f.column] if f.column else [],
                    source_metadata={
                        "observed_value": f.observed_value,
                        "expected_range": f.expected_range.model_dump() if f.expected_range else None,
                        "detected_by": f.detected_by,
                        "row": f.row_reference,
                    },
                )
                evidence_items.append(evd)

    evidence_items.sort(key=lambda x: x.strength, reverse=True)
    return evidence_items
