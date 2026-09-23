"use client";

import React from "react";
import Link from "next/link";
import { DatasetMetadata } from "@/types/dataset";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DatasetCardProps {
  dataset: DatasetMetadata;
  onDelete?: (id: string) => void;
}

export function DatasetCard({ dataset, onDelete }: DatasetCardProps) {
  const getHealthBadge = (score: number) => {
    if (score >= 90) return <Badge variant="success" size="sm">Health: {score}% (A)</Badge>;
    if (score >= 75) return <Badge variant="primary" size="sm">Health: {score}% (B)</Badge>;
    if (score >= 60) return <Badge variant="warning" size="sm">Health: {score}% (C)</Badge>;
    return <Badge variant="danger" size="sm">Health: {score}% (Low)</Badge>;
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Card className="flex flex-col justify-between hover:border-slate-300 transition-all group shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 group-hover:text-teal-900 transition-colors line-clamp-1">
              {dataset.name}
            </CardTitle>
            <p className="text-xs text-slate-500 font-mono truncate max-w-[200px] mt-0.5">
              {dataset.filename}
            </p>
          </div>
          <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase">
            {dataset.file_type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-2 space-y-2.5">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-slate-200 bg-slate-50/70 p-2">
            <span className="text-slate-500 block text-[10px] font-mono uppercase">Rows</span>
            <span className="font-semibold text-slate-900 font-mono">{dataset.row_count.toLocaleString()}</span>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50/70 p-2">
            <span className="text-slate-500 block text-[10px] font-mono uppercase">Columns</span>
            <span className="font-semibold text-slate-900 font-mono">{dataset.column_count}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          {getHealthBadge(dataset.health_score)}
          <span className="text-[11px] text-slate-500 font-mono">{formatDate(dataset.created_at)}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
        {onDelete && (
          <button
            onClick={() => onDelete(dataset.id)}
            className="text-xs text-slate-400 hover:text-rose-700 transition-colors font-mono"
            title="Delete dataset"
          >
            Delete
          </button>
        )}
        <Link
          href={`/datasets/${dataset.id}`}
          className="ml-auto inline-flex items-center space-x-1 text-xs font-semibold text-teal-800 hover:text-teal-950 transition-colors"
        >
          <span>Open Workspace &rarr;</span>
        </Link>
      </CardFooter>
    </Card>
  );
}
