import { apiGet, apiPostFormData, apiDelete } from "@/lib/api";
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
    return apiPostFormData<DatasetResponse>("/datasets/upload", formData);
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
    return apiGet<DatasetMetadata>(`/datasets/${datasetId}`);
  },

  /**
   * Get full statistical and quality profile for a dataset.
   */
  async getDatasetProfile(datasetId: string): Promise<DatasetProfile> {
    return apiGet<DatasetProfile>(`/datasets/${datasetId}/profile`);
  },

  /**
   * Get paginated row/column preview for a dataset.
   */
  async getDatasetPreview(
    datasetId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DatasetPreview> {
    return apiGet<DatasetPreview>(
      `/datasets/${datasetId}/preview?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Delete a dataset by ID.
   */
  async deleteDataset(datasetId: string): Promise<{ message: string; id: string }> {
    return apiDelete<{ message: string; id: string }>(`/datasets/${datasetId}`);
  },
};
