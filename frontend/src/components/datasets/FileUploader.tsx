"use client";

import React, { useState, useRef } from "react";
import { datasetService } from "@/services/datasetService";
import { DatasetResponse } from "@/types/dataset";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface FileUploaderProps {
  onUploadSuccess?: (result: DatasetResponse) => void;
  className?: string;
}

export function FileUploader({ onUploadSuccess, className }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<DatasetResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setSuccessResult(null);

    const validExtensions = [".csv", ".xlsx", ".xls", ".json"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setError(`Unsupported file format "${fileExt}". Please upload a CSV, XLSX, XLS, or JSON file.`);
      setSelectedFile(null);
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError("File size exceeds 50MB limit.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(20);
    setError(null);

    try {
      setUploadProgress(50);
      const result = await datasetService.uploadDataset(selectedFile);
      setUploadProgress(100);
      setSuccessResult(result);
      setIsUploading(false);
      onUploadSuccess?.(result);
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      setError(err?.detail || err?.message || "Failed to upload and profile dataset. Please try again.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-150 cursor-pointer bg-white",
          dragActive
            ? "border-teal-600 bg-teal-50/40 scale-[1.005]"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/50",
          isUploading && "pointer-events-none opacity-80"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
          aria-label="Upload investigation dataset"
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-800 border border-teal-200 mb-3 text-xs font-semibold uppercase tracking-wider">
          {isUploading ? "..." : "FILE"}
        </div>

        <h3 className="text-base font-semibold text-slate-900">
          {isUploading ? "Uploading & Profiling Dataset..." : "Select a dataset file or drag & drop"}
        </h3>
        <p className="mt-1 text-xs text-slate-600 max-w-sm">
          Upload structured data to automatically infer schema, compute statistical distributions, detect anomalies, and generate investigation threads.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" size="sm">CSV (.csv)</Badge>
          <Badge variant="outline" size="sm">Excel (.xlsx, .xls)</Badge>
          <Badge variant="outline" size="sm">JSON (.json)</Badge>
          <span className="text-[11px] text-slate-600 font-mono ml-1">Max 50MB</span>
        </div>
      </div>

      {/* Selected File Card */}
      {selectedFile && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center space-x-3 truncate">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-800 font-mono text-xs font-bold uppercase">
              {selectedFile.name.split(".").pop() || "DAT"}
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-600 font-mono">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {!isUploading && !successResult && (
              <Button onClick={(e) => { e.stopPropagation(); handleUpload(); }} size="sm">
                Upload &amp; Profile
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Progress value={uploadProgress} label="Ingesting and profiling dataset..." showLabel variant="primary" />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900">
          <div className="space-y-1">
            <p className="font-semibold text-red-900">Upload Error</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successResult && (
        <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-950 shadow-sm">
          <div>
            <p className="font-semibold text-teal-900">Dataset Ingested &amp; Profiled Successfully</p>
            <p className="text-[11px] text-teal-700 mt-0.5">
              {successResult.metadata.row_count.toLocaleString()} rows &bull; {successResult.metadata.column_count} columns &bull; Health Score: {successResult.metadata.health_score}/100
            </p>
          </div>
          <a
            href={`/datasets/${successResult.metadata.id}`}
            className="inline-flex items-center rounded-md bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 transition-colors shadow-sm"
          >
            Open Dataset Workspace &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
