from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Body

from app.api.schemas.evidence import (
    EvidenceSummary,
    Evidence,
    Hypothesis,
    InvestigationThread,
    EvidenceCluster,
    EvidenceAnalyzeRequest,
)
from app.services.evidence.engine import evidence_engine

router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.post("/{dataset_id}", response_model=EvidenceSummary)
@router.post("/{dataset_id}/analyze", response_model=EvidenceSummary)
def analyze_dataset_evidence(
    dataset_id: str,
    request: Optional[EvidenceAnalyzeRequest] = Body(default=None),
):
    """
    Synthesize empirical evidence, contradiction signals, candidate hypotheses, and investigation threads.
    """
    force = request.force if request else False
    try:
        summary = evidence_engine.analyze(dataset_id, force=force)
        return summary
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence synthesis failed: {str(e)}",
        )


@router.get("/{dataset_id}", response_model=EvidenceSummary)
def get_dataset_evidence_summary(dataset_id: str):
    """
    Retrieve cached or computed evidence and candidate hypothesis summary.
    """
    try:
        summary = evidence_engine.analyze(dataset_id, force=False)
        return summary
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence retrieval failed: {str(e)}",
        )


@router.get("/{dataset_id}/hypotheses", response_model=List[Hypothesis])
def get_dataset_hypotheses(dataset_id: str):
    """Retrieve candidate hypotheses for a dataset."""
    try:
        return evidence_engine.get_hypotheses(dataset_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )


@router.get("/{dataset_id}/investigations", response_model=List[InvestigationThread])
def get_dataset_investigations(dataset_id: str):
    """Retrieve synthesized investigation threads for a dataset."""
    try:
        return evidence_engine.get_threads(dataset_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )


@router.get("/{dataset_id}/clusters", response_model=List[EvidenceCluster])
def get_dataset_clusters(dataset_id: str):
    """Retrieve feature/entity-grouped evidence clusters."""
    try:
        return evidence_engine.get_clusters(dataset_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
