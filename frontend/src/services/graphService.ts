import { apiGet } from "@/lib/api";
import { KnowledgeGraphResponse, GraphNodeDetailResponse } from "@/types/graph";

export const graphService = {
  /**
   * Retrieve or synthesize interactive Knowledge Graph for a dataset.
   */
  async getGraph(datasetId: string, force: boolean = false): Promise<KnowledgeGraphResponse> {
    const url = force
      ? `/datasets/${datasetId}/graph?force=true`
      : `/datasets/${datasetId}/graph`;
    return apiGet<KnowledgeGraphResponse>(url);
  },

  /**
   * Alias for getGraph
   */
  async getKnowledgeGraph(datasetId: string, force: boolean = false): Promise<KnowledgeGraphResponse> {
    return this.getGraph(datasetId, force);
  },

  /**
   * Retrieve rich details and neighborhood for a specific graph node.
   */
  async getNodeDetail(datasetId: string, nodeId: string): Promise<GraphNodeDetailResponse> {
    return apiGet<GraphNodeDetailResponse>(`/datasets/${datasetId}/graph/node/${nodeId}`);
  },
};
