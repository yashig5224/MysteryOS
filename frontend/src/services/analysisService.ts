import { apiGet, apiPost } from "@/lib/api";
import { AnalysisSummary, AnalysisFinding } from "@/types/analysis";

export const analysisService = {
  /**
   * Execute automatic data mining and anomaly detection on a dataset.
   */
  async runAnalysis(datasetId: string, force: boolean = false): Promise<AnalysisSummary> {
    return apiPost<AnalysisSummary>(`/datasets/${datasetId}/analyze`, { force });
  },

  /**
   * Retrieve cached or computed analysis summary for a dataset.
   */
  async getAnalysis(datasetId: string): Promise<AnalysisSummary> {
    return apiGet<AnalysisSummary>(`/datasets/${datasetId}/analysis`);
  },

  /**
   * Retrieve only anomaly findings for a dataset.
   */
  async getAnomalies(datasetId: string): Promise<AnalysisFinding[]> {
    return apiGet<AnalysisFinding[]>(`/datasets/${datasetId}/anomalies`);
  },

  /**
   * Retrieve statistical and trend insights for a dataset.
   */
  async getInsights(datasetId: string): Promise<AnalysisFinding[]> {
    return apiGet<AnalysisFinding[]>(`/datasets/${datasetId}/insights`);
  },
};
