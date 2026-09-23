from fastapi import APIRouter, HTTPException
from app.services.evidence.engine import EvidenceEngine

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/{dataset_id}")
async def get_report(dataset_id: str):
    engine = EvidenceEngine()
    try:
        summary = engine.get_or_run_evidence_summary(dataset_id)
        return {
            "dataset_id": dataset_id,
            "title": f"Investigation Executive Report: {dataset_id}",
            "evidence_count": summary.total_evidence,
            "hypotheses": summary.hypotheses,
            "threads": summary.threads,
            "clusters": summary.clusters,
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
