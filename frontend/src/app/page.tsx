"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Database,
  Sparkles,
  Layers,
  Network,
  GitBranch,
  ShieldCheck,
  Compass,
  BarChart3,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function Home() {
  const pipelineStages = [
    { num: "01", label: "Ingest", desc: "CSV, XLSX, JSON files" },
    { num: "02", label: "Profile", desc: "Schema & Statistics" },
    { num: "03", label: "Anomalies", desc: "IQR, Z-Score, IsoForest" },
    { num: "04", label: "Patterns", desc: "Correlations & Shifts" },
    { num: "05", label: "Graph", desc: "Interactive Node Network" },
    { num: "06", label: "Evidence", desc: "Corroboration Matrix" },
    { num: "07", label: "Hypotheses", desc: "Deterministic Formulations" },
    { num: "08", label: "AI Reasoning", desc: "Grounded Dossiers & RAG" },
  ];

  const features = [
    {
      code: "ING",
      title: "Universal Tabular Ingestion",
      description: "Seamlessly parse structured datasets, infer semantic column roles, compute missingness and duplicate ratios, and index statistical profiles.",
    },
    {
      code: "ANM",
      title: "Multi-Method Anomaly Detection",
      description: "Execute statistical IQR thresholds, Z-score deviations, Isolation Forest decision spaces, class frequency outliers, and temporal delta spikes.",
    },
    {
      code: "PAT",
      title: "Cross-Variable Pattern Discovery",
      description: "Surface Pearson and Spearman correlations, segment disparities, sustained trends, and structural change points automatically.",
    },
    {
      code: "EVD",
      title: "Evidence & Contradiction Matrix",
      description: "Synthesize empirical signals into weighted evidence items, identify dataset-wide contradictions, and construct prioritized investigation threads.",
    },
    {
      code: "GRP",
      title: "Interactive Knowledge Graph",
      description: "Navigate all discoveries as an interconnected node-link graph with type filters, neighborhood expansion, and direct dossier inspections.",
    },
    {
      code: "RAG",
      title: "Grounded AI Investigation Dossiers",
      description: "Query dataset anomalies and patterns with verified source citations, step-by-step reasoning, and structured next actions.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-800 text-white font-mono text-xs font-bold shadow-sm">
              MOS
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">MysteryOS</span>
              <span className="ml-2 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 uppercase">
                v1.0
              </span>
            </div>
          </div>

          <nav className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors uppercase tracking-wider font-mono"
            >
              Dashboard
            </Link>
            <Link
              href="/datasets"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors uppercase tracking-wider font-mono"
            >
              Datasets
            </Link>
            <Link
              href="/datasets/upload"
              className="inline-flex items-center rounded-md bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 transition-colors shadow-sm"
            >
              <span>+ Upload Dataset</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-14 text-center lg:pt-24">
          <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-mono text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-teal-700" />
            <span>ENTERPRISE DATA INTELLIGENCE &amp; INVESTIGATION PLATFORM</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Autonomous Pattern Discovery &amp; Evidence Synthesis for Tabular Data
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
            MysteryOS ingests structured tabular datasets, extracts statistical anomalies, surfaces multi-variable correlations, builds interactive knowledge graphs, and formulates verifiable candidate hypotheses.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/datasets">
              <Button size="lg" className="shadow-sm">
                <span>Open Dataset Catalog</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/datasets/upload">
              <Button variant="outline" size="lg">
                <span>Upload New Dataset</span>
              </Button>
            </Link>
          </div>
        </section>

        {/* Pipeline Flow Visualization */}
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Autonomous Investigation Pipeline
                </h2>
                <p className="text-xs text-slate-600">
                  End-to-end analytical workflow executed deterministically across every dataset.
                </p>
              </div>
              <Badge variant="success" size="sm">Deterministic &amp; Reproducible</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {pipelineStages.map((stage) => (
                <div
                  key={stage.num}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-left transition-all hover:border-teal-600 hover:bg-white"
                >
                  <span className="font-mono text-[10px] font-bold text-teal-800">{stage.num}</span>
                  <p className="mt-1 text-xs font-bold text-slate-900">{stage.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{stage.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Capabilities Grid */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Core Analytical Engines
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Modular, domain-independent engines designed to extract verifiable truth without hardcoded assumptions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="p-5 bg-white border-slate-200 shadow-sm hover:border-teal-600 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {feature.code}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono uppercase">Engine</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{feature.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-600">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-slate-900">MysteryOS</span>
            <span>&bull; Autonomous Tabular Intelligence System</span>
          </div>
          <p>&copy; 2026 MysteryOS. All analytical engines verified.</p>
        </div>
      </footer>
    </div>
  );
}
