from fastapi import APIRouter, HTTPException, status
from app.api.schemas.graph import KnowledgeGraphResponse, GraphNodeDetailResponse
from app.services.graph.engine import graph_engine
from app.services.ingestion.dataset_store import dataset_store

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/{dataset_id}", response_model=KnowledgeGraphResponse)
def get_dataset_graph(dataset_id: str, force: bool = False):
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


@router.get("/{dataset_id}/node/{node_id}", response_model=GraphNodeDetailResponse)
def get_graph_node_detail(dataset_id: str, node_id: str):
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
