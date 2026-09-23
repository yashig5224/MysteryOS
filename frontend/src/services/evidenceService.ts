import { apiGet, apiPost } from "@/lib/api";
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
    return apiPost<EvidenceSummary>(`/datasets/${datasetId}/evidence/analyze`, { force });
  },

  /**
   * Retrieve cached or computed evidence and candidate hypothesis summary.
   */
  async getEvidenceSummary(datasetId: string): Promise<EvidenceSummary> {
    return apiGet<EvidenceSummary>(`/datasets/${datasetId}/evidence`);
  },

  /**
   * Retrieve candidate hypotheses for a dataset.
   */
  async getHypotheses(datasetId: string): Promise<Hypothesis[]> {
    return apiGet<Hypothesis[]>(`/datasets/${datasetId}/hypotheses`);
  },

  /**
   * Retrieve synthesized investigation threads for a dataset.
   */
  async getInvestigations(datasetId: string): Promise<InvestigationThread[]> {
    return apiGet<InvestigationThread[]>(`/datasets/${datasetId}/investigations`);
  },

  /**
   * Retrieve feature-grouped evidence clusters for a dataset.
   */
  async getClusters(datasetId: string): Promise<EvidenceCluster[]> {
    return apiGet<EvidenceCluster[]>(`/datasets/${datasetId}/evidence/clusters`);
  },

  /**
   * Backward compatible investigation evidence endpoint.
   */
  async listEvidence(investigationId: string): Promise<Evidence[]> {
    return apiGet<Evidence[]>(`/evidence?investigation_id=${investigationId}`);
  },
};
