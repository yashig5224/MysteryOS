from typing import List, Dict, Any, Set, Tuple, Optional
from app.api.schemas.graph import GraphNode, GraphEdge, KnowledgeGraphResponse


def build_knowledge_graph(
    dataset_id: str,
    findings: List[Any],
    patterns: List[Any],
    relationships: List[Any],
    timeline: List[Any],
    evidence_items: List[Any],
    hypotheses: List[Any],
    threads: List[Any],
) -> KnowledgeGraphResponse:
    """
    Transforms MysteryOS analytical artifacts across Phases 3–6 into a unified
    knowledge graph with nodes, typed edges, tier layouts, and thread associations.
    """
    nodes_dict: Dict[str, GraphNode] = {}
    edges_list: List[GraphEdge] = []
    seen_edge_keys: Set[Tuple[str, str, str]] = set()

    # Index thread memberships
    node_to_threads: Dict[str, Set[str]] = {}
    thread_ids_list: List[str] = []

    for t in threads:
        tid = getattr(t, "thread_id", getattr(t, "id", ""))
        if not tid:
            continue
        thread_ids_list.append(tid)

        # Thread itself
        node_to_threads.setdefault(tid, set()).add(tid)

        # Hypotheses in thread
        for hid in getattr(t, "hypothesis_ids", []):
            node_to_threads.setdefault(hid, set()).add(tid)

        # Evidence in thread
        for eid in getattr(t, "evidence_ids", []):
            node_to_threads.setdefault(eid, set()).add(tid)

        # Patterns in thread
        for pid in getattr(t, "pattern_ids", []):
            node_to_threads.setdefault(pid, set()).add(tid)

        # Findings in thread
        for fid in getattr(t, "finding_ids", []):
            node_to_threads.setdefault(fid, set()).add(tid)

        # Events in thread
        for evid in getattr(t, "timeline_event_ids", []):
            node_to_threads.setdefault(evid, set()).add(tid)

    # 1. BUILD NODES
    # -------------------------------------------------------------
    # Tier 5: Investigation Threads
    for idx, t in enumerate(threads):
        tid = getattr(t, "thread_id", getattr(t, "id", ""))
        if not tid:
            continue
        label_text = f"[{tid.upper()}] {getattr(t, 'title', 'Thread')}"
        nodes_dict[tid] = GraphNode(
            id=tid,
            label=label_text,
            type="thread",
            title=getattr(t, "title", "Investigation Thread"),
            description=getattr(t, "summary", ""),
            strength=getattr(t, "priority", 70),
            columns=getattr(t, "primary_columns", []),
            thread_ids=[tid],
            tier=5,
            data={
                "priority": getattr(t, "priority", 70),
                "status": getattr(t, "status", "open"),
                "hypothesis_ids": getattr(t, "hypothesis_ids", []),
                "evidence_ids": getattr(t, "evidence_ids", []),
            },
        )

    # Tier 4: Hypotheses
    for idx, h in enumerate(hypotheses):
        hid = getattr(h, "hypothesis_id", getattr(h, "id", ""))
        if not hid:
            continue
        t_ids = list(node_to_threads.get(hid, set()))
        label_text = f"[{hid.upper()}] {getattr(h, 'title', 'Hypothesis')}"
        nodes_dict[hid] = GraphNode(
            id=hid,
            label=label_text,
            type="hypothesis",
            title=getattr(h, "title", "Candidate Hypothesis"),
            description=getattr(h, "statement", ""),
            confidence=getattr(h, "confidence", 70),
            strength=getattr(h, "evidence_strength", 70),
            columns=getattr(h, "primary_columns", []),
            thread_ids=t_ids,
            tier=4,
            data={
                "statement": getattr(h, "statement", ""),
                "status": getattr(h, "status", "candidate"),
                "confidence": getattr(h, "confidence", 70),
                "reasoning": getattr(h, "reasoning", ""),
                "supporting_evidence_ids": getattr(h, "supporting_evidence_ids", []),
                "contradicting_evidence_ids": getattr(h, "contradicting_evidence_ids", []),
            },
        )

    # Tier 3: Evidence Items
    for idx, e in enumerate(evidence_items):
        eid = getattr(e, "evidence_id", getattr(e, "id", ""))
        if not eid:
            continue
        polarity = getattr(e, "polarity", "support")
        t_ids = list(node_to_threads.get(eid, set()))
        label_text = f"[{eid.upper()}] {getattr(e, 'title', 'Evidence')}"
        nodes_dict[eid] = GraphNode(
            id=eid,
            label=label_text,
            type="evidence",
            title=getattr(e, "title", "Empirical Evidence"),
            description=getattr(e, "description", ""),
            strength=getattr(e, "strength", 70),
            polarity=polarity,
            columns=getattr(e, "columns", []),
            thread_ids=t_ids,
            tier=3,
            data={
                "evidence_type": getattr(e, "evidence_type", "evidence"),
                "polarity": polarity,
                "strength": getattr(e, "strength", 70),
                "supports_pattern_ids": getattr(e, "supports_pattern_ids", []),
                "related_finding_ids": getattr(e, "related_finding_ids", []),
            },
        )

    # Tier 2: Patterns
    for idx, p in enumerate(patterns):
        pid = getattr(p, "pattern_id", getattr(p, "id", ""))
        if not pid:
            continue
        t_ids = list(node_to_threads.get(pid, set()))
        label_text = f"[{pid.upper()}] {getattr(p, 'title', 'Pattern')}"
        nodes_dict[pid] = GraphNode(
            id=pid,
            label=label_text,
            type="pattern",
            title=getattr(p, "title", "Discovered Pattern"),
            description=getattr(p, "description", ""),
            strength=getattr(p, "strength", 70),
            confidence=getattr(p, "strength", 70),
            columns=getattr(p, "columns", []),
            thread_ids=t_ids,
            tier=2,
            data={
                "pattern_type": getattr(p, "type", "general"),
                "direction": getattr(p, "direction", None),
                "significance": getattr(p, "significance", "medium"),
                "supporting_finding_ids": getattr(p, "supporting_finding_ids", []),
            },
        )

    # Tier 1: Findings (Anomalies)
    for idx, f in enumerate(findings):
        fid = getattr(f, "finding_id", getattr(f, "id", ""))
        if not fid:
            continue
        t_ids = list(node_to_threads.get(fid, set()))
        label_text = f"[{fid.upper()}] {getattr(f, 'title', getattr(f, 'column', 'Finding'))}"
        col = getattr(f, "column", "")
        cols = [col] if col else []
        nodes_dict[fid] = GraphNode(
            id=fid,
            label=label_text,
            type="finding",
            title=getattr(f, "title", "Anomaly Finding"),
            description=getattr(f, "description", ""),
            severity=getattr(f, "severity", "medium"),
            strength=getattr(f, "score", 70),
            columns=cols,
            thread_ids=t_ids,
            tier=1,
            data={
                "finding_type": getattr(f, "type", "anomaly"),
                "subtype": getattr(f, "subtype", ""),
                "score": getattr(f, "score", 70),
                "severity": getattr(f, "severity", "medium"),
                "column": col,
                "observed_value": getattr(f, "observed_value", None),
                "expected_value": getattr(f, "expected_value", None),
            },
        )

    # Tier 0: Timeline Events
    for idx, ev in enumerate(timeline):
        evid = getattr(ev, "event_id", getattr(ev, "id", ""))
        if not evid:
            continue
        t_ids = list(node_to_threads.get(evid, set()))
        label_text = f"[{evid.upper()}] {getattr(ev, 'title', 'Timeline Event')}"
        nodes_dict[evid] = GraphNode(
            id=evid,
            label=label_text,
            type="event",
            title=getattr(ev, "title", "Timeline Event"),
            description=getattr(ev, "description", ""),
            strength=getattr(ev, "impact_score", 50),
            columns=getattr(ev, "affected_metrics", []),
            thread_ids=t_ids,
            tier=0,
            data={
                "timestamp": getattr(ev, "timestamp", ""),
                "event_type": getattr(ev, "event_type", "event"),
                "impact_score": getattr(ev, "impact_score", 50),
            },
        )

    # 2. BUILD EDGES
    # -------------------------------------------------------------
    edge_idx = 1

    def add_edge(src: str, tgt: str, label: str, polarity: Optional[str] = None, strength: Optional[int] = None):
        nonlocal edge_idx
        if not src or not tgt or src not in nodes_dict or tgt not in nodes_dict or src == tgt:
            return
        edge_key = (src, tgt, label)
        if edge_key in seen_edge_keys:
            return
        seen_edge_keys.add(edge_key)

        edges_list.append(
            GraphEdge(
                id=f"edge_{edge_idx}",
                source=src,
                target=tgt,
                label=label,
                polarity=polarity,
                strength=strength or 70,
            )
        )
        edge_idx += 1

    # Thread -> Hypothesis edges
    for t in threads:
        tid = getattr(t, "thread_id", getattr(t, "id", ""))
        for hid in getattr(t, "hypothesis_ids", []):
            add_edge(hid, tid, "INVESTIGATED_IN", polarity="support")

    # Hypothesis -> Evidence edges
    for h in hypotheses:
        hid = getattr(h, "hypothesis_id", getattr(h, "id", ""))
        # Supporting evidence
        for eid in getattr(h, "supporting_evidence_ids", []):
            add_edge(eid, hid, "SUPPORTS", polarity="support", strength=85)
        # Contradicting evidence
        for eid in getattr(h, "contradicting_evidence_ids", []):
            add_edge(eid, hid, "CONTRADICTS", polarity="contradict", strength=90)

    # Evidence -> Pattern & Finding edges
    for e in evidence_items:
        eid = getattr(e, "evidence_id", getattr(e, "id", ""))
        polarity = getattr(e, "polarity", "support")
        for pid in getattr(e, "supports_pattern_ids", []):
            add_edge(pid, eid, "GROUNDS_EVIDENCE", polarity=polarity)
        for fid in getattr(e, "related_finding_ids", []):
            add_edge(fid, eid, "SUPPORTS_EVIDENCE", polarity=polarity)

    # Pattern -> Finding edges
    for p in patterns:
        pid = getattr(p, "pattern_id", getattr(p, "id", ""))
        for fid in getattr(p, "supporting_finding_ids", []):
            add_edge(fid, pid, "DERIVED_FROM", polarity="support")

    # Relationships edges
    for r in relationships:
        src = getattr(r, "source_id", getattr(r, "var1", ""))
        tgt = getattr(r, "target_id", getattr(r, "var2", ""))
        rel_type = getattr(r, "type", getattr(r, "relationship_type", "RELATED_TO"))
        if src in nodes_dict and tgt in nodes_dict:
            add_edge(src, tgt, rel_type)

    # Timeline event edges (connect sequential events and connect events to findings/patterns)
    for i in range(len(timeline) - 1):
        ev1_id = getattr(timeline[i], "event_id", getattr(timeline[i], "id", ""))
        ev2_id = getattr(timeline[i + 1], "event_id", getattr(timeline[i + 1], "id", ""))
        add_edge(ev1_id, ev2_id, "OCCURS_BEFORE")

    # 3. POSITIONING ALGORITHM (Layered Tier Layout)
    # Tier 0 (Events, left-top), Tier 1 (Findings, x=100), Tier 2 (Patterns, x=450),
    # Tier 3 (Evidence, x=800), Tier 4 (Hypotheses, x=1150), Tier 5 (Threads, x=1500)
    tier_x_offsets = {
        0: 100,    # Events (top band or leftmost)
        1: 400,    # Findings
        2: 750,    # Patterns
        3: 1100,   # Evidence
        4: 1450,   # Hypotheses
        5: 1800,   # Threads
    }

    tier_counters: Dict[int, int] = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    for node in nodes_dict.values():
        t = node.tier if node.tier is not None else 1
        x_base = tier_x_offsets.get(t, 400)
        y_idx = tier_counters.get(t, 0)
        tier_counters[t] = y_idx + 1

        y_pos = 100 + (y_idx * 130)
        node.position = {"x": float(x_base), "y": float(y_pos)}

    # Count node types
    node_type_counts: Dict[str, int] = {}
    for node in nodes_dict.values():
        node_type_counts[node.type] = node_type_counts.get(node.type, 0) + 1

    return KnowledgeGraphResponse(
        dataset_id=dataset_id,
        nodes=list(nodes_dict.values()),
        edges=edges_list,
        total_nodes=len(nodes_dict),
        total_edges=len(edges_list),
        node_type_counts=node_type_counts,
        thread_ids=thread_ids_list,
    )
