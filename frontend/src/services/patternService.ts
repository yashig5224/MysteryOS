import { apiGet, apiPost } from "@/lib/api";
import { PatternSummary, Pattern, Relationship, TimelineEvent } from "@/types/patterns";

export const patternService = {
  /**
   * Trigger full pattern discovery, correlation analysis, relationships, and timeline synthesis.
   */
  async runPatternAnalysis(datasetId: string, force: boolean = false): Promise<PatternSummary> {
    return apiPost<PatternSummary>(`/datasets/${datasetId}/patterns/analyze`, { force });
  },

  /**
   * Retrieve cached or computed pattern analysis summary.
   */
  async getPatterns(datasetId: string): Promise<PatternSummary> {
    return apiGet<PatternSummary>(`/datasets/${datasetId}/patterns`);
  },

  /**
   * Retrieve discovered relationships between features and findings.
   */
  async getRelationships(datasetId: string): Promise<Relationship[]> {
    return apiGet<Relationship[]>(`/datasets/${datasetId}/relationships`);
  },

  /**
   * Retrieve chronological investigation timeline events.
   */
  async getTimeline(datasetId: string): Promise<TimelineEvent[]> {
    return apiGet<TimelineEvent[]>(`/datasets/${datasetId}/timeline`);
  },
};
