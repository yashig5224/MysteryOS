import uuid
from typing import List, Optional
import pandas as pd

from app.api.schemas.patterns import Relationship, RelationshipType, Pattern, CorrelationPair
from app.api.schemas.analysis import AnalysisFinding


def analyze_relationships(
    dataset_id: str,
    patterns: List[Pattern],
    correlations: List[CorrelationPair],
    findings: Optional[List[AnalysisFinding]] = None,
) -> List[Relationship]:
    """
    Discover inter-variable, temporal, and conceptual relationships between features, findings, and patterns.
    """
    relationships: List[Relationship] = []
    seen_rel_keys = set()

    # 1. Variable Correlation Relationships (CORRELATES_WITH)
    for corr in correlations:
        rel_key = (corr.var1, corr.var2, RelationshipType.CORRELATES_WITH.value)
        if rel_key in seen_rel_keys:
            continue
        seen_rel_keys.add(rel_key)

        supporting_finding_ids = []
        supporting_pattern_ids = []

        if findings:
            for f in findings:
                if f.column in {corr.var1, corr.var2}:
                    supporting_finding_ids.append(f.finding_id)

        for p in patterns:
            if set(p.columns).issubset({corr.var1, corr.var2}):
                supporting_pattern_ids.append(p.pattern_id)

        rel = Relationship(
            relationship_id=f"rel_corr_{uuid.uuid4().hex[:8]}",
            dataset_id=dataset_id,
            source=corr.var1,
            target=corr.var2,
            relationship_type=RelationshipType.CORRELATES_WITH.value,
            strength=int(round(abs(corr.coefficient) * 100)),
            description=f"'{corr.var1}' exhibits a strong {corr.direction} statistical association with '{corr.var2}' (r = {corr.coefficient:+.2f}).",
            supporting_finding_ids=supporting_finding_ids[:5],
            supporting_pattern_ids=supporting_pattern_ids[:3],
            metadata={
                "coefficient": corr.coefficient,
                "direction": corr.direction,
                "method": corr.method,
            },
        )
        relationships.append(rel)

    # 2. Temporal Precedence Relationships (OCCURS_BEFORE)
    temporal_findings = []
    if findings:
        for f in findings:
            # Check if finding has timestamp metadata
            if f.metadata and "timestamp" in f.metadata:
                temporal_findings.append((f.metadata["timestamp"], f))

    if len(temporal_findings) >= 2:
        temporal_findings.sort(key=lambda x: str(x[0]))
        for idx in range(min(5, len(temporal_findings) - 1)):
            t1, f1 = temporal_findings[idx]
            t2, f2 = temporal_findings[idx + 1]

            if f1.finding_id != f2.finding_id:
                src_label = f1.column or f1.title
                tgt_label = f2.column or f2.title
                rel_key = (f1.finding_id, f2.finding_id, RelationshipType.OCCURS_BEFORE.value)
                if rel_key not in seen_rel_keys:
                    seen_rel_keys.add(rel_key)
                    rel = Relationship(
                        relationship_id=f"rel_temp_{uuid.uuid4().hex[:8]}",
                        dataset_id=dataset_id,
                        source=f"Finding: {src_label} ({str(t1)[:10]})",
                        target=f"Finding: {tgt_label} ({str(t2)[:10]})",
                        relationship_type=RelationshipType.OCCURS_BEFORE.value,
                        strength=int(round((f1.score + f2.score) / 2)),
                        description=f"Anomaly in '{src_label}' observed on {t1} occurred prior to anomaly in '{tgt_label}' on {t2}.",
                        supporting_finding_ids=[f1.finding_id, f2.finding_id],
                        supporting_pattern_ids=[],
                        metadata={"time1": str(t1), "time2": str(t2)},
                    )
                    relationships.append(rel)

    # 3. Group Difference Relationships (ASSOCIATED_WITH)
    for p in patterns:
        if p.type == "group_difference" and len(p.columns) >= 2:
            cat_col, num_col = p.columns[0], p.columns[1]
            rel_key = (cat_col, num_col, RelationshipType.ASSOCIATED_WITH.value)
            if rel_key not in seen_rel_keys:
                seen_rel_keys.add(rel_key)
                rel = Relationship(
                    relationship_id=f"rel_grp_{uuid.uuid4().hex[:8]}",
                    dataset_id=dataset_id,
                    source=cat_col,
                    target=num_col,
                    relationship_type=RelationshipType.ASSOCIATED_WITH.value,
                    strength=p.strength,
                    description=f"Distribution of metric '{num_col}' varies significantly by categorical dimension '{cat_col}'.",
                    supporting_finding_ids=p.supporting_finding_ids,
                    supporting_pattern_ids=[p.pattern_id],
                    metadata=p.metadata,
                )
                relationships.append(rel)

    relationships.sort(key=lambda x: x.strength, reverse=True)
    return relationships
