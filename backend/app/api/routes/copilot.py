from fastapi import APIRouter, HTTPException
from app.api.schemas.investigation import InvestigationRequest, InvestigationResponse
from app.services.ai.engine import InvestigationEngine

router = APIRouter(prefix="/copilot", tags=["copilot"])

@router.post("/{dataset_id}/query", response_model=InvestigationResponse)
async def query_copilot(dataset_id: str, request: InvestigationRequest):
    engine = InvestigationEngine()
    try:
        return engine.investigate(
            dataset_id=dataset_id,
            question=request.question,
            thread_id=request.thread_id,
            hypothesis_id=request.hypothesis_id,
            mode=request.mode.value if request.mode else "overview",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
