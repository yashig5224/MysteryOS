import { apiGet, apiPost } from "@/lib/api";
import { apiCache } from "@/services/apiCache";
import {
  InvestigationRequest,
  InvestigationResponse,
  InvestigationSummary,
  InvestigationHistoryResponse,
  SuggestedQuestion,
} from "@/types/investigation";

export const investigationService = {
  /**
   * Ask an analytical question to the AI Investigation Assistant.
   */
  async askQuestion(
    datasetId: string,
    request: InvestigationRequest
  ): Promise<InvestigationResponse> {
    const res = await apiPost<InvestigationResponse>(`/datasets/${datasetId}/investigate`, request);
    apiCache.invalidate(datasetId);
    return res;
  },

  /**
   * Retrieve or generate executive AI investigation summary.
   */
  async getSummary(datasetId: string): Promise<InvestigationSummary> {
    const cached = apiCache.get<InvestigationSummary>(datasetId, "inv-summary");
    if (cached) return cached;
    return apiCache.dedupe<InvestigationSummary>(`${datasetId}:inv-summary`, async () => {
      const res = await apiGet<InvestigationSummary>(`/datasets/${datasetId}/investigation/summary`);
      apiCache.set(datasetId, "inv-summary", res);
      return res;
    });
  },

  /**
   * Retrieve dynamic suggested investigation questions.
   */
  async getSuggestedQuestions(datasetId: string): Promise<SuggestedQuestion[]> {
    const cached = apiCache.get<SuggestedQuestion[]>(datasetId, "suggested-questions");
    if (cached) return cached;
    return apiCache.dedupe<SuggestedQuestion[]>(`${datasetId}:suggested-questions`, async () => {
      const res = await apiGet<SuggestedQuestion[]>(`/datasets/${datasetId}/investigation/suggested-questions`);
      apiCache.set(datasetId, "suggested-questions", res);
      return res;
    });
  },

  /**
   * Retrieve conversation history for current dataset session.
   */
  async getHistory(datasetId: string): Promise<InvestigationHistoryResponse> {
    const cached = apiCache.get<InvestigationHistoryResponse>(datasetId, "history");
    if (cached) return cached;
    return apiCache.dedupe<InvestigationHistoryResponse>(`${datasetId}:history`, async () => {
      const res = await apiGet<InvestigationHistoryResponse>(`/datasets/${datasetId}/investigation/history`);
      apiCache.set(datasetId, "history", res);
      return res;
    });
  },

  /**
   * Reset session conversation history and cached queries.
   */
  async resetHistory(datasetId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiPost<{ success: boolean; message: string }>(
      `/datasets/${datasetId}/investigation/reset`,
      {}
    );
    apiCache.invalidate(datasetId);
    return res;
  },
};

