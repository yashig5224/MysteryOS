"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Network, Compass } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { datasetService } from "@/services/datasetService";
import { DatasetMetadata } from "@/types/dataset";

export default function InvestigationPage() {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await datasetService.listDatasets();
        setDatasets(list);
      } catch (err) {
        console.error("Investigation dataset fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
      <Header
        title="Investigation Hub"
        subtitle="Select a dataset target to launch interactive knowledge graphs and AI investigation dossiers"
        badge={<Badge variant="primary">INVESTIGATION ACTIVE</Badge>}
      />

      <PageContainer className="py-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Available Investigation Targets</h2>
          <p className="text-xs text-slate-600">
            Each dataset maintains an independent Knowledge Graph, empirical evidence clusters, and a grounded RAG assistant.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-lg bg-white border border-slate-200 p-5 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : datasets.length === 0 ? (
          <Card className="p-12 text-center bg-white border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">No Datasets Available for Investigation</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Upload a dataset to generate investigation graphs and begin hypothesis exploration.
            </p>
            <Link href="/datasets/upload">
              <Button size="sm">
                <span>Upload Dataset</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasets.map((ds) => (
              <Card
                key={ds.id}
                className="p-5 bg-white border-slate-200 hover:border-teal-600 hover:shadow-md transition-all shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" size="sm" className="font-mono uppercase">
                      {ds.file_type}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-teal-800">
                      HEALTH {ds.health_score}/100
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 truncate">{ds.name}</h3>
                  <p className="text-xs text-slate-600 font-mono">
                    {ds.row_count.toLocaleString()} rows &bull; {ds.column_count} columns
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/datasets/${ds.id}`}
                    className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center space-x-1"
                  >
                    <span>Launch Investigation Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
