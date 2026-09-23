from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from app.api.schemas.investigation import (
    InvestigationRequest,
    InvestigationResponse,
    InvestigationSummary,
    InvestigationHistoryResponse,
    SuggestedQuestion,
)
from app.services.ai.engine import investigation_engine
from app.services.ingestion.dataset_store import dataset_store

router = APIRouter(prefix="/investigations", tags=["investigations"])


@router.post("/{dataset_id}/ask", response_model=InvestigationResponse)
@router.post("/{dataset_id}/investigate", response_model=InvestigationResponse)
def ask_question(dataset_id: str, request: InvestigationRequest):
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    return investigation_engine.investigate(dataset_id=dataset_id, request=request)


@router.get("/{dataset_id}/summary", response_model=InvestigationSummary)
def get_summary(dataset_id: str):
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    return investigation_engine.generate_investigation_summary(dataset_id)


@router.get("/{dataset_id}/history", response_model=InvestigationHistoryResponse)
def get_history(dataset_id: str):
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    messages = investigation_engine.get_history(dataset_id)
    return InvestigationHistoryResponse(
        dataset_id=dataset_id,
        messages=messages,
        total_messages=len(messages),
    )


@router.post("/{dataset_id}/reset")
def reset_history(dataset_id: str):
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    success = investigation_engine.reset_history(dataset_id)
    return {"message": "Reset successful", "dataset_id": dataset_id, "success": success}


@router.get("/{dataset_id}/suggested-questions", response_model=List[SuggestedQuestion])
def get_suggested_questions(dataset_id: str):
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    return investigation_engine.get_suggested_questions(dataset_id)
