import { apiGet, apiPost } from "@/lib/api";
import { apiCache } from "@/services/apiCache";
import { AnalysisSummary, AnalysisFinding } from "@/types/analysis";

export const analysisService = {
  /**
   * Execute automatic data mining and anomaly detection on a dataset.
   */
  async runAnalysis(datasetId: string, force: boolean = false): Promise<AnalysisSummary> {
    const res = await apiPost<AnalysisSummary>(`/datasets/${datasetId}/analyze`, { force });
    apiCache.invalidate(datasetId);
    return res;
  },

  /**
   * Retrieve cached or computed analysis summary for a dataset.
   */
  async getAnalysis(datasetId: string): Promise<AnalysisSummary> {
    const cached = apiCache.get<AnalysisSummary>(datasetId, "analysis");
    if (cached) return cached;
    return apiCache.dedupe<AnalysisSummary>(`${datasetId}:analysis`, async () => {
      const res = await apiGet<AnalysisSummary>(`/datasets/${datasetId}/analysis`);
      apiCache.set(datasetId, "analysis", res);
      return res;
    });
  },

  /**
   * Retrieve only anomaly findings for a dataset.
   */
  async getAnomalies(datasetId: string): Promise<AnalysisFinding[]> {
    const cached = apiCache.get<AnalysisFinding[]>(datasetId, "anomalies");
    if (cached) return cached;
    return apiCache.dedupe<AnalysisFinding[]>(`${datasetId}:anomalies`, async () => {
      const res = await apiGet<AnalysisFinding[]>(`/datasets/${datasetId}/anomalies`);
      apiCache.set(datasetId, "anomalies", res);
      return res;
    });
  },

  /**
   * Retrieve statistical and trend insights for a dataset.
   */
  async getInsights(datasetId: string): Promise<AnalysisFinding[]> {
    const cached = apiCache.get<AnalysisFinding[]>(datasetId, "insights");
    if (cached) return cached;
    return apiCache.dedupe<AnalysisFinding[]>(`${datasetId}:insights`, async () => {
      const res = await apiGet<AnalysisFinding[]>(`/datasets/${datasetId}/insights`);
      apiCache.set(datasetId, "insights", res);
      return res;
    });
  },
};

