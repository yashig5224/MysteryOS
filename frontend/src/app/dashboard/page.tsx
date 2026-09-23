"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, RefreshCw, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { datasetService } from "@/services/datasetService";
import { DatasetMetadata } from "@/types/dataset";

export default function DashboardPage() {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDatasets() {
      try {
        const list = await datasetService.listDatasets();
        setDatasets(list);
      } catch (err) {
        console.error("Dashboard dataset load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDatasets();
  }, []);

  const totalRows = datasets.reduce((acc, d) => acc + (d.row_count || 0), 0);
  const totalCols = datasets.reduce((acc, d) => acc + (d.column_count || 0), 0);
  const avgHealth = datasets.length > 0
    ? Math.round(datasets.reduce((acc, d) => acc + (d.health_score || 0), 0) / datasets.length)
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
      <Header
        title="Investigation Dashboard"
        subtitle="Global platform overview, ingested datasets, and analytical operations"
        badge={<Badge variant="primary">SYSTEM ACTIVE</Badge>}
        actions={
          <div className="flex items-center space-x-2">
            <Link href="/datasets/upload">
              <Button size="sm">
                <span>+ Upload Dataset</span>
              </Button>
            </Link>
          </div>
        }
      />

      <PageContainer className="py-10 space-y-10">
        {/* ──── KPI Metric Overview ──── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-2">
            <span className="kpi-label block">Indexed Datasets</span>
            <div className="kpi-figure-sm text-slate-900">
              {datasets.length}
            </div>
            <p className="kpi-sublabel">Active investigation targets</p>
          </Card>

          <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-2">
            <span className="kpi-label block">Total Records Indexed</span>
            <div className="kpi-figure-sm text-slate-900">
              {totalRows.toLocaleString()}
            </div>
            <p className="kpi-sublabel">Across {totalCols} detected features</p>
          </Card>

          <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-2">
            <span className="kpi-label block">Avg Data Health Score</span>
            <div className="kpi-figure-sm text-teal-800">
              {avgHealth}/100
            </div>
            <p className="kpi-sublabel">Global tabular data readiness</p>
          </Card>

          <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-2">
            <span className="kpi-label block">Pipeline Engines</span>
            <div className="kpi-figure-sm text-slate-900">
              7 / 7
            </div>
            <p className="kpi-sublabel text-teal-700 font-medium">All analytical engines online</p>
          </Card>
        </div>

        {/* ──── Dataset Health Overview Chart ──── */}
        {!loading && datasets.length > 0 && (
          <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="section-heading">Dataset Health Distribution</h2>
              <p className="section-subheading mt-1">Quality scores across all ingested datasets</p>
            </div>
            <div className="chart-container chart-container-lg">
              <svg className="w-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none" style={{ minHeight: "180px" }}>
                {/* Grid */}
                <line x1="5" y1="10" x2="95" y2="10" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="5" y1="25" x2="95" y2="25" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="5" y1="40" x2="95" y2="40" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Health score bars */}
                {datasets.slice(0, 8).map((ds, i) => {
                  const barWidth = Math.max(2, 85 / Math.max(datasets.length, 1));
                  const xPos = 7 + i * (90 / Math.max(datasets.length, 1));
                  const barHeight = (ds.health_score / 100) * 35;
                  const barColor = ds.health_score >= 90 ? "#0f766e" : ds.health_score >= 75 ? "#0284c7" : ds.health_score >= 60 ? "#d97706" : "#b91c1c";
                  return (
                    <g key={ds.id}>
                      <rect
                        x={`${xPos}%`}
                        y={45 - barHeight}
                        width={`${barWidth}%`}
                        height={barHeight}
                        fill={barColor}
                        rx="2"
                        opacity="0.85"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600 font-mono pt-2 border-t border-slate-100">
              {datasets.slice(0, 8).map((ds) => (
                <span key={ds.id} className="truncate max-w-[120px] text-xs">
                  {ds.name}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* ──── Ingested Datasets Section ──── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-heading">Active Investigation Workspaces</h2>
              <p className="section-subheading mt-1">Select a dataset to view knowledge graphs, anomaly findings, and AI investigation dossiers.</p>
            </div>
            <Link href="/datasets">
              <Button variant="outline" size="sm">
                <span>View Full Catalog &rarr;</span>
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-52 rounded-xl bg-white border border-slate-200 p-6 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : datasets.length === 0 ? (
            <Card className="p-16 text-center bg-white border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-bold text-slate-900">No Datasets Ingested Yet</h3>
              <p className="text-base text-slate-600 max-w-lg mx-auto">
                Upload your first CSV, XLSX, or JSON file to initiate automated schema profiling, anomaly mining, and graph construction.
              </p>
              <Link href="/datasets/upload">
                <Button size="md">
                  <span>Upload Dataset</span>
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {datasets.slice(0, 6).map((ds) => (
                <Card
                  key={ds.id}
                  className="p-6 bg-white border-slate-200 hover:border-teal-600 hover:shadow-md transition-all shadow-sm flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" size="sm" className="font-mono uppercase text-sm">
                        {ds.file_type}
                      </Badge>
                      <span className="font-mono text-sm font-bold text-teal-800">
                        HEALTH {ds.health_score}/100
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 truncate">{ds.name}</h3>
                    <p className="text-base text-slate-600 font-mono">
                      {ds.row_count.toLocaleString()} rows &bull; {ds.column_count} columns
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/datasets/${ds.id}`}
                      className="text-sm font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center space-x-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <span className="text-sm text-slate-600 font-mono">
                      {ds.created_at ? new Date(ds.created_at).toLocaleDateString() : "Indexed"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ──── Engine Architecture Overview ──── */}
        <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="section-heading uppercase tracking-wider font-mono">
              MysteryOS Pipeline Architecture
            </h3>
            <p className="section-subheading mt-1">Overview of analytical modules running in the investigation system.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-2">
              <span className="font-mono font-bold text-base text-slate-900 block">Phase 2: Profiling Engine</span>
              <p className="text-sm text-slate-600">Schema inference, semantic type assignment, null statistics, quality grading.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-2">
              <span className="font-mono font-bold text-base text-slate-900 block">Phase 3: Anomaly Engine</span>
              <p className="text-sm text-slate-600">IQR bounds, Z-scores, Isolation Forest, frequency shifts, finding scoring.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-2">
              <span className="font-mono font-bold text-base text-slate-900 block">Phase 4-5: Pattern &amp; Evidence</span>
              <p className="text-sm text-slate-600">Correlations, timeline sequences, contradiction detection, candidate hypotheses.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-2">
              <span className="font-mono font-bold text-base text-slate-900 block">Phase 6-7: Graph &amp; RAG</span>
              <p className="text-sm text-slate-600">Interactive node-link workspace, structured AI investigation dossiers.</p>
            </div>
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
