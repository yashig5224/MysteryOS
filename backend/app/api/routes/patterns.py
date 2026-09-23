from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Body

from app.api.schemas.patterns import (
    PatternSummary,
    Pattern,
    Relationship,
    TimelineEvent,
    PatternAnalyzeRequest,
)
from app.services.patterns.engine import pattern_engine

router = APIRouter(prefix="/patterns", tags=["patterns"])


@router.post("/{dataset_id}", response_model=PatternSummary)
@router.post("/{dataset_id}/analyze", response_model=PatternSummary)
def analyze_dataset_patterns(
    dataset_id: str,
    request: Optional[PatternAnalyzeRequest] = Body(default=None),
):
    """
    Trigger pattern discovery, correlation analysis, relationship mapping, and timeline synthesis.
    """
    force = request.force if request else False
    try:
        summary = pattern_engine.analyze(dataset_id, force=force)
        return summary
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pattern analysis failed: {str(e)}",
        )


@router.get("/{dataset_id}", response_model=PatternSummary)
def get_dataset_patterns_summary(dataset_id: str):
    """
    Retrieve cached or computed pattern summary for a dataset.
    """
    try:
        summary = pattern_engine.analyze(dataset_id, force=False)
        return summary
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pattern retrieval failed: {str(e)}",
        )
