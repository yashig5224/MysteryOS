import { apiGet } from "@/lib/api";
import { apiCache } from "@/services/apiCache";
import { KnowledgeGraphResponse, GraphNodeDetailResponse } from "@/types/graph";

export const graphService = {
  /**
   * Retrieve or synthesize interactive Knowledge Graph for a dataset.
   */
  async getGraph(datasetId: string, force: boolean = false): Promise<KnowledgeGraphResponse> {
    if (force) {
      apiCache.invalidateOne(datasetId, "graph");
    } else {
      const cached = apiCache.get<KnowledgeGraphResponse>(datasetId, "graph");
      if (cached) return cached;
    }

    return apiCache.dedupe<KnowledgeGraphResponse>(`${datasetId}:graph`, async () => {
      const url = force
        ? `/datasets/${datasetId}/graph?force=true`
        : `/datasets/${datasetId}/graph`;
      const res = await apiGet<KnowledgeGraphResponse>(url);
      apiCache.set(datasetId, "graph", res);
      return res;
    });
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
    const endpoint = `graph-node:${nodeId}`;
    const cached = apiCache.get<GraphNodeDetailResponse>(datasetId, endpoint);
    if (cached) return cached;

    return apiCache.dedupe<GraphNodeDetailResponse>(`${datasetId}:${endpoint}`, async () => {
      const res = await apiGet<GraphNodeDetailResponse>(`/datasets/${datasetId}/graph/node/${nodeId}`);
      apiCache.set(datasetId, endpoint, res);
      return res;
    });
  },
};
