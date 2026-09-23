"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FileUploader } from "@/components/datasets/FileUploader";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatasetResponse } from "@/types/dataset";

export default function UploadPage() {
  const router = useRouter();

  const handleUploadSuccess = (result: DatasetResponse) => {
    // Keep user on page to review success banner and open dataset workspace
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
      <Header
        title="Upload Dataset"
        subtitle="Ingest and run automated statistical data profiling on tabular datasets"
        badge={<Badge variant="primary">Tabular Ingestion</Badge>}
        actions={
          <Link
            href="/datasets"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Datasets</span>
          </Link>
        }
      />

      <PageContainer className="py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Upload Zone */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 bg-white border-slate-200 shadow-sm">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base text-slate-900">Select Investigation Dataset</CardTitle>
                <p className="text-xs text-slate-600">
                  Upload raw CSV, XLSX, or JSON files directly. MysteryOS will parse the records, infer column semantics, detect missing values, and calculate statistical profiles.
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <FileUploader onUploadSuccess={handleUploadSuccess} />
              </CardContent>
            </Card>
          </div>

          {/* Profiling Engine Features */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Automated Ingestion Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-slate-600">
                <div className="space-y-1">
                  <span className="font-semibold text-slate-900 block">Health Scoring (0–100)</span>
                  <p>Evaluates completeness, duplicate ratios, consistency, and data validity across every cell.</p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-slate-900 block">Semantic Type Inference</span>
                  <p>Distinguishes primary IDs, datetime timestamps, categorical features, and numerical metrics.</p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-slate-900 block">Statistical Moments</span>
                  <p>Calculates mean, median, quartiles (25%/75%), standard deviation, zero counts, and top categories.</p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-slate-900 block">Knowledge Graph Extraction</span>
                  <p>Downstream entities (findings, patterns, evidence, hypotheses) are automatically linked for visual exploration.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
