import os
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

from app.api.schemas.evidence import (
    EvidenceSummary,
    Evidence,
    Hypothesis,
    EvidenceCluster,
    InvestigationThread,
    InvestigationGraphData,
)
from app.services.ingestion.dataset_store import dataset_store
from app.services.analysis.engine import analysis_engine
from app.services.patterns.engine import pattern_engine
from app.services.evidence.evidence_builder import build_evidence_items
from app.services.evidence.contradiction_detector import detect_contradictory_evidence
from app.services.evidence.evidence_linker import link_evidence_clusters
from app.services.evidence.hypothesis_generator import generate_candidate_hypotheses
from app.services.evidence.investigation_thread import build_investigation_threads


class EvidenceEngine:
    """
    Central orchestrator for Phase 5 Evidence Synthesis, Contradiction Analysis,
    Candidate Hypothesis Generation, and Investigation Thread Construction.
    """

    def __init__(self, processed_dir: Optional[Path] = None):
        if processed_dir is None:
            self.processed_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "processed"
        else:
            self.processed_dir = processed_dir
        self.processed_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_path(self, dataset_id: str) -> Path:
        return self.processed_dir / f"evidence_{dataset_id}.json"

    def analyze(self, dataset_id: str, force: bool = False) -> EvidenceSummary:
        """
        Execute evidence synthesis and candidate hypothesis generation.
        Returns cached results unless force=True.
        """
        cache_path = self._get_cache_path(dataset_id)
        if not force and cache_path.exists():
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return EvidenceSummary(**data)
            except Exception:
                pass

        start_time = time.time()

        # 1. Load dataset
        df = dataset_store.get_dataset_df(dataset_id)
        if df is None:
            raise FileNotFoundError(f"Dataset '{dataset_id}' not found.")

        # 2. Load Phase 3 findings
        try:
            analysis_summary = analysis_engine.analyze(dataset_id, force=False)
            findings = analysis_summary.findings
        except Exception:
            findings = []

        # 3. Load Phase 4 patterns & relationships
        try:
            pattern_summary = pattern_engine.analyze(dataset_id, force=False)
            patterns = pattern_summary.patterns
            relationships = pattern_summary.relationships
            timeline = pattern_summary.timeline
            correlations = pattern_summary.correlations
        except Exception:
            patterns = []
            relationships = []
            timeline = []
            correlations = []

        # 4. Build Evidence Items
        evidence_items = build_evidence_items(
            dataset_id=dataset_id,
            findings=findings,
            patterns=patterns,
            relationships=relationships,
            timeline=timeline,
            correlations=correlations,
        )

        # 5. Detect Contradictory Evidence
        contradictions = detect_contradictory_evidence(
            df=df,
            dataset_id=dataset_id,
            patterns=patterns,
            findings=findings,
        )
        all_evidence = evidence_items + contradictions
        all_evidence.sort(key=lambda x: x.strength, reverse=True)

        # 6. Link Evidence Clusters
        clusters = link_evidence_clusters(
            dataset_id=dataset_id,
            evidence_items=all_evidence,
            patterns=patterns,
            findings=findings,
            relationships=relationships,
            timeline=timeline,
        )

        # 7. Generate Candidate Hypotheses
        hypotheses = generate_candidate_hypotheses(
            dataset_id=dataset_id,
            evidence_items=all_evidence,
            patterns=patterns,
            relationships=relationships,
            timeline=timeline,
            correlations=correlations,
            contradictions=contradictions,
        )

        # 8. Build Investigation Threads & Graph
        threads, graph_data = build_investigation_threads(
            dataset_id=dataset_id,
            hypotheses=hypotheses,
            evidence_items=all_evidence,
            patterns=patterns,
            findings=findings,
            relationships=relationships,
            timeline=timeline,
        )

        # Tiers of evidence
        strong_count = sum(1 for e in all_evidence if e.strength >= 80)
        moderate_count = sum(1 for e in all_evidence if 50 <= e.strength < 80)
        weak_count = sum(1 for e in all_evidence if e.strength < 50)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        summary = EvidenceSummary(
            dataset_id=dataset_id,
            status="completed" if (all_evidence or hypotheses or threads) else "empty",
            total_evidence=len(all_evidence),
            strong_evidence=strong_count,
            moderate_evidence=moderate_count,
            weak_evidence=weak_count,
            total_hypotheses=len(hypotheses),
            total_investigation_threads=len(threads),
            top_threads=threads[:3],
            evidence=all_evidence,
            hypotheses=hypotheses,
            clusters=clusters,
            threads=threads,
            graph_data=graph_data,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=duration_ms,
        )

        # Cache results to disk
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(summary.model_dump(), f, indent=2)
        except Exception:
            pass

        return summary

    def get_evidence(self, dataset_id: str) -> List[Evidence]:
        summary = self.analyze(dataset_id, force=False)
        return summary.evidence

    def get_hypotheses(self, dataset_id: str) -> List[Hypothesis]:
        summary = self.analyze(dataset_id, force=False)
        return summary.hypotheses

    def get_threads(self, dataset_id: str) -> List[InvestigationThread]:
        summary = self.analyze(dataset_id, force=False)
        return summary.threads

    def get_clusters(self, dataset_id: str) -> List[EvidenceCluster]:
        summary = self.analyze(dataset_id, force=False)
        return summary.clusters


# Singleton instance
evidence_engine = EvidenceEngine()
