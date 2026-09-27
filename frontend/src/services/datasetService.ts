import { apiGet, apiPostFormData, apiDelete } from "@/lib/api";
import { apiCache } from "@/services/apiCache";
import {
  DatasetMetadata,
  DatasetProfile,
  DatasetResponse,
  DatasetPreview,
} from "@/types/dataset";

export const datasetService = {
  /**
   * Upload a dataset file (CSV, XLSX, JSON) and receive metadata & profile.
   */
  async uploadDataset(file: File): Promise<DatasetResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiPostFormData<DatasetResponse>("/datasets/upload", formData);
    apiCache.clear();
    return res;
  },

  /**
   * List all registered datasets.
   */
  async listDatasets(): Promise<DatasetMetadata[]> {
    return apiGet<DatasetMetadata[]>("/datasets");
  },

  /**
   * Get metadata for a specific dataset.
   */
  async getDataset(datasetId: string): Promise<DatasetMetadata> {
    const cached = apiCache.get<DatasetMetadata>(datasetId, "metadata");
    if (cached) return cached;
    const res = await apiGet<DatasetMetadata>(`/datasets/${datasetId}`);
    apiCache.set(datasetId, "metadata", res);
    return res;
  },

  /**
   * Get full statistical and quality profile for a dataset.
   */
  async getDatasetProfile(datasetId: string): Promise<DatasetProfile> {
    const cached = apiCache.get<DatasetProfile>(datasetId, "profile");
    if (cached) return cached;
    const res = await apiGet<DatasetProfile>(`/datasets/${datasetId}/profile`);
    apiCache.set(datasetId, "profile", res);
    return res;
  },

  /**
   * Get paginated row/column preview for a dataset.
   */
  async getDatasetPreview(
    datasetId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DatasetPreview> {
    const endpoint = `preview?limit=${limit}&offset=${offset}`;
    const cached = apiCache.get<DatasetPreview>(datasetId, endpoint);
    if (cached) return cached;
    const res = await apiGet<DatasetPreview>(
      `/datasets/${datasetId}/preview?limit=${limit}&offset=${offset}`
    );
    apiCache.set(datasetId, endpoint, res);
    return res;
  },

  /**
   * Delete a dataset by ID.
   */
  async deleteDataset(datasetId: string): Promise<{ message: string; id: string }> {
    const res = await apiDelete<{ message: string; id: string }>(`/datasets/${datasetId}`);
    apiCache.invalidate(datasetId);
    return res;
  },
};

