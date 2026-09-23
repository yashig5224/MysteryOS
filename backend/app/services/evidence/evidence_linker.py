import uuid
from typing import List, Dict, Set
from app.api.schemas.evidence import Evidence, EvidenceCluster
from app.api.schemas.patterns import Pattern, Relationship, TimelineEvent
from app.api.schemas.analysis import AnalysisFinding


def link_evidence_clusters(
    dataset_id: str,
    evidence_items: List[Evidence],
    patterns: List[Pattern],
    findings: List[AnalysisFinding],
    relationships: List[Relationship],
    timeline: List[TimelineEvent],
) -> List[EvidenceCluster]:
    """
    Deterministically group evidence, patterns, findings, and events into coherent domain clusters.
    """
    clusters: List[EvidenceCluster] = []
    if not evidence_items:
        return clusters

    # Group by primary column intersections
    col_to_evidence: Dict[str, List[Evidence]] = {}
    for evd in evidence_items:
        for col in evd.columns:
            col_to_evidence.setdefault(col, []).append(evd)

    seen_cluster_cols = set()

    for col, evds in col_to_evidence.items():
        if len(evds) >= 2 and col not in seen_cluster_cols:
            seen_cluster_cols.add(col)

            evd_ids = list(set(e.evidence_id for e in evds))
            # Correlated pattern IDs
            pat_ids = list(set(p.pattern_id for p in patterns if col in p.columns))
            # Correlated finding IDs
            fnd_ids = list(set(f.finding_id for f in findings if f.column == col))
            # Correlated relationship IDs
            rel_ids = list(set(r.relationship_id for r in relationships if col in {r.source, r.target}))
            # Correlated timeline IDs
            evt_ids = list(set(e.event_id for e in timeline if e.column == col))

            avg_strength = int(round(sum(e.strength for e in evds) / len(evds)))

            cluster = EvidenceCluster(
                cluster_id=f"clst_{uuid.uuid4().hex[:8]}",
                dataset_id=dataset_id,
                title=f"Evidence Cluster around Feature '{col}'",
                summary=(
                    f"Concentration of {len(evds)} evidence items, {len(pat_ids)} patterns, and {len(fnd_ids)} anomalies "
                    f"converging on feature '{col}'."
                ),
                strength=avg_strength,
                evidence_ids=evd_ids[:8],
                finding_ids=fnd_ids[:8],
                pattern_ids=pat_ids[:5],
                relationship_ids=rel_ids[:5],
                timeline_event_ids=evt_ids[:5],
                primary_columns=[col],
            )
            clusters.append(cluster)

    clusters.sort(key=lambda x: x.strength, reverse=True)
    return clusters
