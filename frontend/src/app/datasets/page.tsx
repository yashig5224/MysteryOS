"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, AlertCircle } from "lucide-react";
import { datasetService } from "@/services/datasetService";
import { DatasetMetadata } from "@/types/dataset";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { DatasetCard } from "@/components/dashboard/DatasetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDatasets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await datasetService.listDatasets();
      setDatasets(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    try {
      await datasetService.deleteDataset(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert("Failed to delete dataset: " + (err?.message || "Unknown error"));
    }
  };

  const filteredDatasets = datasets.filter((ds) => {
    const query = searchQuery.toLowerCase();
    return (
      ds.name.toLowerCase().includes(query) ||
      ds.filename.toLowerCase().includes(query) ||
      ds.file_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
      <Header
        title="Datasets"
        subtitle="Manage, profile, and analyze structured datasets (CSV, XLSX, JSON)"
        badge={<Badge variant="primary">{datasets.length} Total</Badge>}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDatasets}
              disabled={loading}
              title="Refresh datasets"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Link href="/datasets/upload">
              <Button size="sm">
                <span>+ Upload Dataset</span>
              </Button>
            </Link>
          </div>
        }
      />

      <PageContainer className="py-8 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search datasets by name or format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-600 font-mono">
            <span>FORMATS:</span>
            <span className="font-semibold text-slate-800">CSV, XLSX, JSON</span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchDatasets}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && datasets.length === 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 rounded-lg border border-slate-200 bg-white p-6 animate-pulse shadow-sm"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredDatasets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-800 border border-teal-200 mb-3 font-mono text-xs font-bold">
              DAT
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              {searchQuery ? "No matching datasets found" : "No datasets ingested yet"}
            </h3>
            <p className="mt-1 text-xs text-slate-600 max-w-sm">
              {searchQuery
                ? "Try searching for a different keyword or file name."
                : "Upload your first CSV, Excel, or JSON dataset to begin deep automated profiling, data mining, and investigation graph analysis."}
            </p>
            {!searchQuery && (
              <Link href="/datasets/upload" className="mt-6">
                <Button size="sm">
                  <span>Upload Dataset</span>
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Dataset Grid */}
        {filteredDatasets.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDatasets.map((ds) => (
              <DatasetCard key={ds.id} dataset={ds} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
