import uuid
from typing import List, Dict, Tuple
from app.api.schemas.evidence import (
    InvestigationThread,
    Hypothesis,
    Evidence,
    InvestigationGraphData,
    InvestigationGraphNode,
    InvestigationGraphEdge,
)
from app.api.schemas.patterns import Pattern, Relationship, TimelineEvent
from app.api.schemas.analysis import AnalysisFinding
from app.services.evidence.evidence_scorer import calculate_thread_priority


def build_investigation_threads(
    dataset_id: str,
    hypotheses: List[Hypothesis],
    evidence_items: List[Evidence],
    patterns: List[Pattern],
    findings: List[AnalysisFinding],
    relationships: List[Relationship],
    timeline: List[TimelineEvent],
) -> Tuple[List[InvestigationThread], InvestigationGraphData]:
    """
    Synthesize coherent investigation threads and assemble graph-ready nodes and edges.
    """
    threads: List[InvestigationThread] = []
    nodes: List[InvestigationGraphNode] = []
    edges: List[InvestigationGraphEdge] = []
    seen_nodes = set()
    seen_edges = set()

    # 1. Helper to add graph node
    def add_node(n_id: str, label: str, n_type: str, data: Dict = None):
        if n_id not in seen_nodes:
            seen_nodes.add(n_id)
            nodes.append(InvestigationGraphNode(id=n_id, label=label, type=n_type, data=data or {}))

    # 2. Helper to add graph edge
    def add_edge(src: str, tgt: str, label: str, strength: int = None):
        e_key = (src, tgt, label)
        if e_key not in seen_edges and src in seen_nodes and tgt in seen_nodes:
            seen_edges.add(e_key)
            edges.append(InvestigationGraphEdge(
                id=f"edge_{uuid.uuid4().hex[:8]}",
                source=src,
                target=tgt,
                label=label,
                strength=strength,
            ))

    # Add primary entities to graph
    for f in findings:
        add_node(f.finding_id, f.title[:30], "finding", {"severity": f.severity, "score": f.score})
    for p in patterns:
        add_node(p.pattern_id, p.title[:30], "pattern", {"type": p.type, "strength": p.strength})
    for e in evidence_items:
        add_node(e.evidence_id, e.title[:30], "evidence", {"strength": e.strength, "polarity": e.polarity})
    for h in hypotheses:
        add_node(h.hypothesis_id, h.title[:30], "hypothesis", {"confidence": h.confidence})
    for evt in timeline:
        add_node(evt.event_id, evt.title[:30], "event", {"importance": evt.importance})

    # Add edges
    for e in evidence_items:
        for f_id in e.related_finding_ids:
            add_edge(f_id, e.evidence_id, "DERIVED_FROM")
        for p_id in e.supports_pattern_ids:
            add_edge(e.evidence_id, p_id, "SUPPORTS" if e.polarity == "support" else "CONTRADICTS")

    for h in hypotheses:
        for evd_id in h.supporting_evidence_ids:
            add_edge(evd_id, h.hypothesis_id, "SUPPORTS")
        for evd_id in h.contradicting_evidence_ids:
            add_edge(evd_id, h.hypothesis_id, "CONTRADICTS")
        for p_id in h.supporting_pattern_ids:
            add_edge(p_id, h.hypothesis_id, "SUPPORTS")

    # 3. Create Investigation Threads based on top hypotheses
    for h in hypotheses[:5]:
        connected_evd = [e for e in evidence_items if e.evidence_id in h.supporting_evidence_ids or e.evidence_id in h.contradicting_evidence_ids]
        connected_pat = [p for p in patterns if p.pattern_id in h.supporting_pattern_ids]
        connected_fnd = []
        for e in connected_evd:
            connected_fnd.extend(e.related_finding_ids)
        connected_fnd = list(set(connected_fnd))

        connected_events = [evt for evt in timeline if any(f_id in evt.source_finding_ids for f_id in connected_fnd)]

        has_high_sev = any(f.severity == "high" for f in findings if f.finding_id in connected_fnd)
        priority = calculate_thread_priority(
            highest_confidence=h.confidence,
            evidence_count=len(connected_evd),
            finding_count=len(connected_fnd),
            has_high_severity=has_high_sev,
        )

        thread = InvestigationThread(
            thread_id=f"thr_{uuid.uuid4().hex[:8]}",
            dataset_id=dataset_id,
            title=f"Investigation: {h.title}",
            priority=priority,
            status="open",
            summary=(
                f"{h.statement} Grounded by {len(connected_evd)} empirical evidence item(s), "
                f"{len(connected_pat)} structural pattern(s), and {len(connected_fnd)} investigative anomalies."
            ),
            hypothesis_ids=[h.hypothesis_id],
            evidence_ids=[e.evidence_id for e in connected_evd],
            pattern_ids=[p.pattern_id for p in connected_pat],
            finding_ids=connected_fnd,
            timeline_event_ids=[evt.event_id for evt in connected_events],
            primary_columns=h.primary_columns,
        )
        threads.append(thread)

    # Fallback thread if no hypotheses generated
    if not threads and (findings or patterns or evidence_items):
        thread = InvestigationThread(
            thread_id=f"thr_general_{uuid.uuid4().hex[:8]}",
            dataset_id=dataset_id,
            title="General Dataset Anomaly & Pattern Investigation",
            priority=50,
            status="open",
            summary=f"General inquiry covering {len(findings)} detected anomalies and {len(patterns)} patterns.",
            hypothesis_ids=[],
            evidence_ids=[e.evidence_id for e in evidence_items[:5]],
            pattern_ids=[p.pattern_id for p in patterns[:5]],
            finding_ids=[f.finding_id for f in findings[:5]],
            timeline_event_ids=[evt.event_id for evt in timeline[:5]],
            primary_columns=[],
        )
        threads.append(thread)

    threads.sort(key=lambda x: x.priority, reverse=True)
    graph_data = InvestigationGraphData(nodes=nodes, edges=edges)

    return threads, graph_data
