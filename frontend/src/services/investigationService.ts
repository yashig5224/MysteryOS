import { apiGet, apiPost } from "@/lib/api";
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
    return apiPost<InvestigationResponse>(`/datasets/${datasetId}/investigate`, request);
  },

  /**
   * Retrieve or generate executive AI investigation summary.
   */
  async getSummary(datasetId: string): Promise<InvestigationSummary> {
    return apiGet<InvestigationSummary>(`/datasets/${datasetId}/investigation/summary`);
  },

  /**
   * Retrieve dynamic suggested investigation questions.
   */
  async getSuggestedQuestions(datasetId: string): Promise<SuggestedQuestion[]> {
    return apiGet<SuggestedQuestion[]>(`/datasets/${datasetId}/investigation/suggested-questions`);
  },

  /**
   * Retrieve conversation history for current dataset session.
   */
  async getHistory(datasetId: string): Promise<InvestigationHistoryResponse> {
    return apiGet<InvestigationHistoryResponse>(`/datasets/${datasetId}/investigation/history`);
  },

  /**
   * Reset session conversation history and cached queries.
   */
  async resetHistory(datasetId: string): Promise<{ success: boolean; message: string }> {
    return apiPost<{ success: boolean; message: string }>(
      `/datasets/${datasetId}/investigation/reset`,
      {}
    );
  },
};
