import { apiGet } from "@/lib/api";

export const reportService = {
  async getReport(investigationId: string): Promise<any> {
    return apiGet(`/reports/${investigationId}`);
  },
};
