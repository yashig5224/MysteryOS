import { apiGet, apiPost } from "@/lib/api";
import { apiCache } from "@/services/apiCache";
import {
  EvidenceSummary,
  Evidence,
  Hypothesis,
  InvestigationThread,
  EvidenceCluster,
} from "@/types/evidence";

export const evidenceService = {
  /**
   * Synthesize empirical evidence, contradiction signals, candidate hypotheses, and investigation threads.
   */
  async runEvidenceAnalysis(datasetId: string, force: boolean = false): Promise<EvidenceSummary> {
    const res = await apiPost<EvidenceSummary>(`/datasets/${datasetId}/evidence/analyze`, { force });
    apiCache.invalidate(datasetId);
    return res;
  },

  /**
   * Retrieve cached or computed evidence and candidate hypothesis summary.
   */
  async getEvidenceSummary(datasetId: string): Promise<EvidenceSummary> {
    const cached = apiCache.get<EvidenceSummary>(datasetId, "evidence");
    if (cached) return cached;
    return apiCache.dedupe<EvidenceSummary>(`${datasetId}:evidence`, async () => {
      const res = await apiGet<EvidenceSummary>(`/datasets/${datasetId}/evidence`);
      apiCache.set(datasetId, "evidence", res);
      return res;
    });
  },

  /**
   * Retrieve candidate hypotheses for a dataset.
   */
  async getHypotheses(datasetId: string): Promise<Hypothesis[]> {
    const cached = apiCache.get<Hypothesis[]>(datasetId, "hypotheses");
    if (cached) return cached;
    return apiCache.dedupe<Hypothesis[]>(`${datasetId}:hypotheses`, async () => {
      const res = await apiGet<Hypothesis[]>(`/datasets/${datasetId}/hypotheses`);
      apiCache.set(datasetId, "hypotheses", res);
      return res;
    });
  },

  /**
   * Retrieve synthesized investigation threads for a dataset.
   */
  async getInvestigations(datasetId: string): Promise<InvestigationThread[]> {
    const cached = apiCache.get<InvestigationThread[]>(datasetId, "investigations");
    if (cached) return cached;
    return apiCache.dedupe<InvestigationThread[]>(`${datasetId}:investigations`, async () => {
      const res = await apiGet<InvestigationThread[]>(`/datasets/${datasetId}/investigations`);
      apiCache.set(datasetId, "investigations", res);
      return res;
    });
  },

  /**
   * Retrieve feature-grouped evidence clusters for a dataset.
   */
  async getClusters(datasetId: string): Promise<EvidenceCluster[]> {
    const cached = apiCache.get<EvidenceCluster[]>(datasetId, "clusters");
    if (cached) return cached;
    return apiCache.dedupe<EvidenceCluster[]>(`${datasetId}:clusters`, async () => {
      const res = await apiGet<EvidenceCluster[]>(`/datasets/${datasetId}/evidence/clusters`);
      apiCache.set(datasetId, "clusters", res);
      return res;
    });
  },

  /**
   * Backward compatible investigation evidence endpoint.
   */
  async listEvidence(investigationId: string): Promise<Evidence[]> {
    return apiGet<Evidence[]>(`/evidence?investigation_id=${investigationId}`);
  },
};

