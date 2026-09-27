import { apiGet, apiPost } from "@/lib/api";
import { apiCache } from "@/services/apiCache";
import { PatternSummary, Pattern, Relationship, TimelineEvent } from "@/types/patterns";

export const patternService = {
  /**
   * Trigger full pattern discovery, correlation analysis, relationships, and timeline synthesis.
   */
  async runPatternAnalysis(datasetId: string, force: boolean = false): Promise<PatternSummary> {
    const res = await apiPost<PatternSummary>(`/datasets/${datasetId}/patterns/analyze`, { force });
    apiCache.invalidate(datasetId);
    return res;
  },

  /**
   * Retrieve cached or computed pattern analysis summary.
   */
  async getPatterns(datasetId: string): Promise<PatternSummary> {
    const cached = apiCache.get<PatternSummary>(datasetId, "patterns");
    if (cached) return cached;
    const res = await apiGet<PatternSummary>(`/datasets/${datasetId}/patterns`);
    apiCache.set(datasetId, "patterns", res);
    return res;
  },

  /**
   * Retrieve discovered relationships between features and findings.
   */
  async getRelationships(datasetId: string): Promise<Relationship[]> {
    const cached = apiCache.get<Relationship[]>(datasetId, "relationships");
    if (cached) return cached;
    const res = await apiGet<Relationship[]>(`/datasets/${datasetId}/relationships`);
    apiCache.set(datasetId, "relationships", res);
    return res;
  },

  /**
   * Retrieve chronological investigation timeline events.
   */
  async getTimeline(datasetId: string): Promise<TimelineEvent[]> {
    const cached = apiCache.get<TimelineEvent[]>(datasetId, "timeline");
    if (cached) return cached;
    const res = await apiGet<TimelineEvent[]>(`/datasets/${datasetId}/timeline`);
    apiCache.set(datasetId, "timeline", res);
    return res;
  },
};

