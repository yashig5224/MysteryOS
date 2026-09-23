from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from app.services.ingestion.dataset_store import dataset_store
from app.services.profiling.profiler import profile_dataset
from app.services.analysis.engine import analysis_engine
from app.services.patterns.engine import pattern_engine
from app.services.evidence.engine import evidence_engine


class BaseRetriever(ABC):
    """
    Abstract interface for MysteryOS RAG Retrievers.
    Allows StructuredRetriever now, and VectorRetriever / pgvector in future phases.
    """

    @abstractmethod
    def retrieve_context(
        self,
        dataset_id: str,
        question: Optional[str] = None,
        thread_id: Optional[str] = None,
        hypothesis_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        pass


class StructuredRetriever(BaseRetriever):
    """
    Structured RAG Retriever over MysteryOS analytical artifacts:
    Findings (Phase 3), Patterns & Timeline (Phase 4), Evidence & Hypotheses (Phase 5),
    and Dataset Profiling (Phase 2).
    """

    def __init__(self):
        pass

    def retrieve_dataset_profile(self, dataset_id: str) -> Dict[str, Any]:
        try:
            meta = dataset_store.get_dataset_metadata(dataset_id)
            df = dataset_store.get_dataset_df(dataset_id)
            if df is not None:
                prof = profile_dataset(df, dataset_id, meta.name if meta else dataset_id)
                return {
                    "id": dataset_id,
                    "name": meta.name if meta else dataset_id,
                    "row_count": prof.row_count,
                    "column_count": prof.column_count,
                    "health_score": prof.health_score,
                    "columns": [
                        {
                            "name": c.name,
                            "semantic_type": c.semantic_type,
                            "missing_count": c.missing_count,
                            "missing_pct": round(c.missing_pct, 1),
                            "mean": round(c.mean, 2) if c.mean is not None else None,
                            "min": round(c.min, 2) if c.min is not None else None,
                            "max": round(c.max, 2) if c.max is not None else None,
                        }
                        for c in prof.columns[:15]
                    ],
                }
        except Exception:
            pass
        return {"id": dataset_id, "name": dataset_id, "row_count": 0, "column_count": 0}

    def retrieve_findings(self, dataset_id: str) -> List[Dict[str, Any]]:
        try:
            summary = analysis_engine.analyze(dataset_id, force=False)
            return [
                {
                    "id": getattr(f, "finding_id", getattr(f, "id", "")),
                    "type": f.type,
                    "subtype": getattr(f, "subtype", ""),
                    "title": getattr(f, "title", ""),
                    "column": f.column,
                    "severity": f.severity,
                    "score": f.score,
                    "description": f.description,
                }
                for f in summary.findings
            ]
        except Exception:
            return []

    def retrieve_patterns(self, dataset_id: str) -> List[Dict[str, Any]]:
        try:
            summary = pattern_engine.analyze(dataset_id, force=False)
            return [
                {
                    "id": getattr(p, "pattern_id", getattr(p, "id", "")),
                    "type": p.type,
                    "title": p.title,
                    "description": p.description,
                    "confidence": getattr(p, "strength", getattr(p, "confidence", 70)),
                    "strength": getattr(p, "strength", 70),
                    "columns": getattr(p, "columns", []),
                    "direction": getattr(p, "direction", None),
                }
                for p in summary.patterns
            ]
        except Exception:
            return []

    def retrieve_timeline(self, dataset_id: str) -> List[Dict[str, Any]]:
        try:
            summary = pattern_engine.analyze(dataset_id, force=False)
            return [
                {
                    "id": getattr(t, "event_id", getattr(t, "id", "")),
                    "timestamp": t.timestamp,
                    "title": t.title,
                    "description": t.description,
                    "event_type": getattr(t, "event_type", getattr(t, "type", "event")),
                    "impact_score": getattr(t, "impact_score", getattr(t, "significance", 50)),
                }
                for t in summary.timeline
            ]
        except Exception:
            return []

    def retrieve_evidence(self, dataset_id: str) -> List[Dict[str, Any]]:
        try:
            summary = evidence_engine.analyze(dataset_id, force=False)
            return [
                {
                    "id": getattr(e, "evidence_id", getattr(e, "id", "")),
                    "type": getattr(e, "evidence_type", getattr(e, "type", "evidence")),
                    "polarity": getattr(e, "polarity", "support"),
                    "direction": getattr(e, "polarity", "support"),
                    "strength": e.strength,
                    "title": e.title,
                    "observation": e.description,
                    "description": e.description,
                    "columns": getattr(e, "columns", []),
                    "supports_pattern_ids": getattr(e, "supports_pattern_ids", []),
                    "is_contradiction": getattr(e, "polarity", "support") == "contradict",
                }
                for e in summary.evidence
            ]
        except Exception:
            return []

    def retrieve_hypotheses(self, dataset_id: str) -> List[Dict[str, Any]]:
        try:
            summary = evidence_engine.analyze(dataset_id, force=False)
            return [
                {
                    "id": getattr(h, "hypothesis_id", getattr(h, "id", "")),
                    "title": h.title,
                    "statement": h.statement,
                    "confidence": getattr(h, "confidence", 70),
                    "plausibility_score": getattr(h, "confidence", 70),
                    "status": h.status,
                    "supporting_evidence_ids": getattr(h, "supporting_evidence_ids", []),
                    "contradictory_evidence_ids": getattr(h, "contradicting_evidence_ids", getattr(h, "contradictory_evidence_ids", [])),
                    "reasoning": getattr(h, "reasoning", ""),
                }
                for h in summary.hypotheses
            ]
        except Exception:
            return []

    def retrieve_threads(self, dataset_id: str) -> List[Dict[str, Any]]:
        try:
            summary = evidence_engine.analyze(dataset_id, force=False)
            return [
                {
                    "id": getattr(t, "thread_id", getattr(t, "id", "")),
                    "title": t.title,
                    "priority": t.priority,
                    "status": t.status,
                    "summary": getattr(t, "summary", ""),
                    "primary_hypothesis_id": t.hypothesis_ids[0] if getattr(t, "hypothesis_ids", None) else None,
                    "evidence_ids": getattr(t, "evidence_ids", []),
                    "pattern_ids": getattr(t, "pattern_ids", []),
                    "finding_ids": getattr(t, "finding_ids", []),
                }
                for t in summary.threads
            ]
        except Exception:
            return []

    def retrieve_context(
        self,
        dataset_id: str,
        question: Optional[str] = None,
        thread_id: Optional[str] = None,
        hypothesis_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Assemble the comprehensive structured context for an investigation query.
        """
        profile = self.retrieve_dataset_profile(dataset_id)
        findings = self.retrieve_findings(dataset_id)
        patterns = self.retrieve_patterns(dataset_id)
        timeline = self.retrieve_timeline(dataset_id)
        evidence_items = self.retrieve_evidence(dataset_id)
        hypotheses = self.retrieve_hypotheses(dataset_id)
        threads = self.retrieve_threads(dataset_id)

        # Contradictions subset
        contradictions = [
            e for e in evidence_items
            if e.get("is_contradiction") or e.get("polarity") == "contradict" or e.get("direction") == "contradicts"
        ]

        # Resolve active thread
        active_thread = None
        if thread_id:
            for t in threads:
                if t["id"] == thread_id:
                    active_thread = t
                    break
        if not active_thread and threads:
            active_thread = threads[0]

        # Resolve focus hypothesis
        focus_hyp = None
        if hypothesis_id:
            for h in hypotheses:
                if h["id"] == hypothesis_id:
                    focus_hyp = h
                    break
        if not focus_hyp and active_thread and active_thread.get("primary_hypothesis_id"):
            for h in hypotheses:
                if h["id"] == active_thread["primary_hypothesis_id"]:
                    focus_hyp = h
                    break
        if not focus_hyp and hypotheses:
            focus_hyp = hypotheses[0]

        return {
            "dataset_profile": profile,
            "active_thread": active_thread,
            "focus_hypothesis": focus_hyp,
            "hypotheses": hypotheses,
            "evidence": evidence_items,
            "contradictions": contradictions,
            "patterns": patterns,
            "timeline": timeline,
            "findings": findings,
            "threads": threads,
        }
