# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, status
from app.api.schemas.analysis import AnalysisSummary
from app.services.analysis.engine import analysis_engine

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/{dataset_id}", response_model=AnalysisSummary)
def run_analysis(dataset_id: str):
    try:
        return analysis_engine.analyze(dataset_id, force=True)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}",
        )


@router.get("/{dataset_id}", response_model=AnalysisSummary)
def get_analysis(dataset_id: str):
    try:
        return analysis_engine.analyze(dataset_id, force=False)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis retrieval failed: {str(e)}",
        )

