from fastapi import APIRouter, HTTPException
from app.services.evidence.engine import EvidenceEngine

router = APIRouter(prefix="/hypotheses", tags=["hypotheses"])

@router.get("/{dataset_id}")
async def get_hypotheses_by_dataset(dataset_id: str):
    engine = EvidenceEngine()
    try:
        summary = engine.get_or_run_evidence_summary(dataset_id)
        return summary.hypotheses
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
