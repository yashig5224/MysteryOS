from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status, Body

from app.api.schemas.dataset import (
    DatasetResponse,
    DatasetMetadata,
    DatasetProfile,
    DatasetPreview,
)
from app.services.ingestion.dataset_store import dataset_store
from app.services.ingestion.loader import load_dataset
from app.services.profiling.profiler import profile_dataset
from app.utils.file_utils import is_supported_file
from app.utils.validators import validate_dataset_size

router = APIRouter(prefix="/datasets", tags=["datasets"])

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a dataset file (CSV, XLSX, XLS, JSON).
    Validates file type and size, parses data, runs comprehensive profiling, and persists dataset.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty.",
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{suffix}'. Supported formats: CSV, XLSX, XLS, JSON.",
        )

    # Read content and validate size
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}",
        )

    try:
        validate_dataset_size(len(content), max_bytes=MAX_FILE_SIZE_BYTES)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(e),
        )

    # Save file to uploads directory
    try:
        dataset_id, file_path = dataset_store.save_uploaded_file(file.filename, content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file on server: {str(e)}",
        )

    # Load DataFrame and profile it
    try:
        df = load_dataset(str(file_path))
    except Exception as e:
        # Clean up corrupted file if failed
        dataset_store.delete_dataset(dataset_id)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not parse dataset content: {str(e)}",
        )

    if df.empty and len(df.columns) == 0:
        dataset_store.delete_dataset(dataset_id)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded dataset is completely empty.",
        )

    # Run profiling
    try:
        profile = profile_dataset(df, dataset_id=dataset_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profiling failed: {str(e)}",
        )

    # Register in store
    file_type = suffix.lstrip(".").upper()
    display_name = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()

    metadata = dataset_store.register_dataset(
        dataset_id=dataset_id,
        name=display_name,
        filename=file.filename,
        file_type=file_type,
        size_bytes=len(content),
        file_path=str(file_path),
        row_count=profile.row_count,
        column_count=profile.column_count,
        health_score=profile.quality.overall_score,
        profile_data=profile.model_dump(),
    )

    return DatasetResponse(metadata=metadata, profile=profile)


@router.get("", response_model=List[DatasetMetadata])
def list_datasets():
    """List all registered datasets sorted by creation date."""
    return dataset_store.list_datasets()


@router.get("/{dataset_id}", response_model=DatasetMetadata)
def get_dataset(dataset_id: str):
    """Retrieve metadata for a specific dataset."""
    metadata = dataset_store.get_dataset_metadata(dataset_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    return metadata


@router.get("/{dataset_id}/profile", response_model=DatasetProfile)
def get_dataset_profile(dataset_id: str):
    """Retrieve comprehensive statistical and quality profile for a dataset."""
    profile = dataset_store.get_dataset_profile(dataset_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile for dataset '{dataset_id}' not found.",
        )
    return profile


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def get_dataset_preview(
    dataset_id: str,
    limit: int = Query(50, ge=1, le=500, description="Max rows to return"),
    offset: int = Query(0, ge=0, description="Row offset for pagination"),
):
    """Retrieve paginated rows and columns preview for a dataset."""
    preview = dataset_store.get_dataset_preview(dataset_id, limit=limit, offset=offset)
    if not preview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' preview not available.",
        )
    return preview


from app.api.schemas.analysis import AnalysisSummary, AnalysisFinding, AnalyzeRequest
from app.services.analysis.engine import analysis_engine


@router.post("/{dataset_id}/analyze", response_model=AnalysisSummary)
def run_dataset_analysis(
    dataset_id: str,
    request: Optional[AnalyzeRequest] = None,
):
    """
    Trigger automatic data mining and anomaly detection on a dataset.
    Returns structured analysis summary with deduplicated findings.
    """
    force = request.force if request else False
    try:
        summary = analysis_engine.analyze(dataset_id, force=force)
        return summary
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


@router.get("/{dataset_id}/analysis", response_model=AnalysisSummary)
def get_dataset_analysis(dataset_id: str):
    """
    Retrieve cached or computed analysis summary for a dataset.
    """
    try:
        summary = analysis_engine.analyze(dataset_id, force=False)
        return summary
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


@router.get("/{dataset_id}/anomalies", response_model=List[AnalysisFinding])
def get_dataset_anomalies(dataset_id: str):
    """
    Retrieve only anomaly findings for a dataset.
    """
    try:
        anomalies = analysis_engine.get_anomalies(dataset_id)
        return anomalies
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )


@router.get("/{dataset_id}/insights", response_model=List[AnalysisFinding])
def get_dataset_insights(dataset_id: str):
    """
    Retrieve statistical and trend insights for a dataset.
    """
    try:
        insights = analysis_engine.get_insights(dataset_id)
        return insights
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )


from app.api.schemas.patterns import PatternSummary, Pattern, Relationship, TimelineEvent, PatternAnalyzeRequest
from app.services.patterns.engine import pattern_engine


@router.post("/{dataset_id}/patterns/analyze", response_model=PatternSummary)
def run_dataset_pattern_analysis(
    dataset_id: str,
    request: Optional[PatternAnalyzeRequest] = Body(default=None),
):
    """
    Execute pattern discovery, correlations, relationships, and timeline analysis.
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


@router.get("/{dataset_id}/patterns", response_model=PatternSummary)
def get_dataset_patterns(dataset_id: str):
    """
    Retrieve cached or computed pattern analysis summary.
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


@router.get("/{dataset_id}/relationships", response_model=List[Relationship])
def get_dataset_relationships(dataset_id: str):
    """
    Retrieve discovered inter-variable and temporal relationships for a dataset.
    """
    try:
        relationships = pattern_engine.get_relationships(dataset_id)
        return relationships
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )


@router.get("/{dataset_id}/timeline", response_model=List[TimelineEvent])
def get_dataset_timeline(dataset_id: str):
    """
    Retrieve chronological investigation timeline events for a dataset.
    """
    try:
        timeline = pattern_engine.get_timeline(dataset_id)
        return timeline
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )


from app.api.schemas.evidence import (
    EvidenceSummary,
    Evidence,
    Hypothesis,
    InvestigationThread,
    EvidenceCluster,
    EvidenceAnalyzeRequest,
)
from app.services.evidence.engine import evidence_engine


@router.post("/{dataset_id}/evidence/analyze", response_model=EvidenceSummary)
def run_dataset_evidence_analysis(
    dataset_id: str,
    request: Optional[EvidenceAnalyzeRequest] = Body(default=None),
):
    """
    Execute evidence synthesis, contradiction analysis, hypothesis generation, and investigation threads.
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


@router.get("/{dataset_id}/evidence", response_model=EvidenceSummary)
def get_dataset_evidence(dataset_id: str):
    """Retrieve cached or computed evidence summary for a dataset."""
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
    """Retrieve investigation threads for a dataset."""
    try:
        return evidence_engine.get_threads(dataset_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )


@router.get("/{dataset_id}/evidence/clusters", response_model=List[EvidenceCluster])
def get_dataset_evidence_clusters(dataset_id: str):
    """Retrieve evidence clusters for a dataset."""
    try:
        return evidence_engine.get_clusters(dataset_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str):
    """Delete a dataset and its stored files."""
    deleted = dataset_store.delete_dataset(dataset_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    return {"message": "Dataset deleted successfully", "id": dataset_id}


# ==========================================
# PHASE 6: AI INVESTIGATION ASSISTANT ROUTES
# ==========================================

from app.api.schemas.investigation import (
    InvestigationRequest,
    InvestigationResponse,
    InvestigationSummary,
    InvestigationHistoryResponse,
    SuggestedQuestion,
)
from app.services.ai.engine import investigation_engine


@router.post("/{dataset_id}/investigate", response_model=InvestigationResponse)
@router.post("/{dataset_id}/ask", response_model=InvestigationResponse)
def ask_investigation_question(
    dataset_id: str,
    request: InvestigationRequest,
):
    """
    Ask an analytical question to the AI Investigation Assistant.
    Reasons over structured dataset evidence, anomalies, patterns, hypotheses, and timeline.
    """
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    try:
        response = investigation_engine.investigate(dataset_id=dataset_id, request=request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Investigation failed: {str(e)}",
        )


@router.get("/{dataset_id}/investigation/summary", response_model=InvestigationSummary)
def get_dataset_investigation_summary(dataset_id: str):
    """
    Retrieve or generate executive AI investigation summary for the dataset.
    """
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    try:
        return investigation_engine.generate_investigation_summary(dataset_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summary generation failed: {str(e)}",
        )


@router.get("/{dataset_id}/investigation/suggested-questions", response_model=List[SuggestedQuestion])
def get_suggested_investigation_questions(dataset_id: str):
    """
    Retrieve dynamically generated smart suggested questions derived from actual dataset findings.
    """
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    try:
        return investigation_engine.get_suggested_questions(dataset_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Suggested questions generation failed: {str(e)}",
        )


@router.get("/{dataset_id}/investigation/history", response_model=InvestigationHistoryResponse)
def get_dataset_investigation_history(dataset_id: str):
    """
    Retrieve investigation conversation session history for the dataset.
    """
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


@router.post("/{dataset_id}/investigation/reset")
def reset_dataset_investigation_history(dataset_id: str):
    """
    Reset investigation conversation history and cached responses for the dataset.
    """
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    success = investigation_engine.reset_history(dataset_id)
    return {"message": "Investigation history reset successfully", "dataset_id": dataset_id, "success": success}


# ==========================================
# PHASE 7: INTERACTIVE KNOWLEDGE GRAPH ROUTES
# ==========================================

from app.api.schemas.graph import KnowledgeGraphResponse, GraphNodeDetailResponse
from app.services.graph.engine import graph_engine


@router.get("/{dataset_id}/graph", response_model=KnowledgeGraphResponse)
def get_dataset_knowledge_graph(dataset_id: str, force: bool = False):
    """
    Retrieve or synthesize interactive Knowledge Graph for a dataset.
    Connects findings, patterns, timeline events, evidence, hypotheses, and investigation threads.
    """
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    try:
        return graph_engine.get_graph(dataset_id=dataset_id, force=force)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Knowledge graph synthesis failed: {str(e)}",
        )


@router.get("/{dataset_id}/graph/node/{node_id}", response_model=GraphNodeDetailResponse)
def get_dataset_graph_node_detail(dataset_id: str, node_id: str):
    """
    Retrieve detailed metadata and immediate neighborhood for a specific graph node.
    """
    if not dataset_store.dataset_exists(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    detail = graph_engine.get_node_detail(dataset_id=dataset_id, node_id=node_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node '{node_id}' not found in dataset '{dataset_id}' knowledge graph.",
        )
    return detail







