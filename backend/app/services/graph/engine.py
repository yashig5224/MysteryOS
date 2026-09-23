import json
from pathlib import Path
from typing import Optional, Dict, Any, List

from app.api.schemas.graph import (
    KnowledgeGraphResponse,
    GraphNodeDetailResponse,
    GraphNode,
    GraphEdge,
)
from app.services.ingestion.dataset_store import dataset_store
from app.services.analysis.engine import analysis_engine
from app.services.patterns.engine import pattern_engine
from app.services.evidence.engine import evidence_engine
from app.services.graph.builder import build_knowledge_graph


class KnowledgeGraphEngine:
    """
    Central engine for Knowledge Graph generation, caching, and node inspection.
    """

    def __init__(self, processed_dir: Optional[Path] = None):
        if processed_dir is None:
            self.processed_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "processed"
        else:
            self.processed_dir = processed_dir
        self.processed_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_path(self, dataset_id: str) -> Path:
        return self.processed_dir / f"graph_{dataset_id}.json"

    def get_graph(self, dataset_id: str, force: bool = False) -> KnowledgeGraphResponse:
        """
        Synthesize or load cached Knowledge Graph for a dataset.
        """
        cache_path = self._get_cache_path(dataset_id)
        if not force and cache_path.exists():
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return KnowledgeGraphResponse(**data)
            except Exception:
                pass

        if not dataset_store.dataset_exists(dataset_id):
            raise FileNotFoundError(f"Dataset '{dataset_id}' not found.")

        # 1. Retrieve Phase 3 Findings
        try:
            analysis_summary = analysis_engine.analyze(dataset_id, force=False)
            findings = analysis_summary.findings
        except Exception:
            findings = []

        # 2. Retrieve Phase 4 Patterns, Relationships, Timeline
        try:
            pattern_summary = pattern_engine.analyze(dataset_id, force=False)
            patterns = pattern_summary.patterns
            relationships = pattern_summary.relationships
            timeline = pattern_summary.timeline
        except Exception:
            patterns = []
            relationships = []
            timeline = []

        # 3. Retrieve Phase 5 Evidence, Hypotheses, Threads
        try:
            evidence_summary = evidence_engine.analyze(dataset_id, force=False)
            evidence_items = evidence_summary.evidence
            hypotheses = evidence_summary.hypotheses
            threads = evidence_summary.threads
        except Exception:
            evidence_items = []
            hypotheses = []
            threads = []

        # 4. Build graph
        graph_response = build_knowledge_graph(
            dataset_id=dataset_id,
            findings=findings,
            patterns=patterns,
            relationships=relationships,
            timeline=timeline,
            evidence_items=evidence_items,
            hypotheses=hypotheses,
            threads=threads,
        )

        # Cache to disk
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(graph_response.model_dump(), f, indent=2)
        except Exception:
            pass

        return graph_response

    def get_node_detail(self, dataset_id: str, node_id: str) -> Optional[GraphNodeDetailResponse]:
        """
        Retrieve rich detail for a specific graph node along with its immediate neighborhood.
        """
        graph = self.get_graph(dataset_id, force=False)
        target_norm = node_id.strip().lower()

        target_node = None
        for n in graph.nodes:
            if n.id.lower() == target_norm:
                target_node = n
                break

        if not target_node:
            return None

        # Find connected edges
        connected_edges: List[GraphEdge] = []
        connected_node_ids: set[str] = set()

        for e in graph.edges:
            if e.source.lower() == target_norm:
                connected_edges.append(e)
                connected_node_ids.add(e.target.lower())
            elif e.target.lower() == target_norm:
                connected_edges.append(e)
                connected_node_ids.add(e.source.lower())

        connected_nodes: List[GraphNode] = [
            n for n in graph.nodes if n.id.lower() in connected_node_ids
        ]

        return GraphNodeDetailResponse(
            dataset_id=dataset_id,
            node=target_node,
            connected_nodes=connected_nodes,
            connected_edges=connected_edges,
            related_threads=target_node.thread_ids,
            raw_artifact=target_node.data,
        )


# Singleton
graph_engine = KnowledgeGraphEngine()
