"use client";

import React from "react";
import { X } from "lucide-react";
import { AnalysisFinding } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FindingDetailModalProps {
  finding: AnalysisFinding | null;
  onClose: () => void;
}

export function FindingDetailModal({ finding, onClose }: FindingDetailModalProps) {
  if (!finding) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return <Badge variant="danger" size="md">HIGH SEVERITY</Badge>;
      case "medium":
        return <Badge variant="warning" size="md">MEDIUM SEVERITY</Badge>;
      default:
        return <Badge variant="primary" size="md">LOW SEVERITY</Badge>;
    }
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return "N/A";
    if (typeof val === "number") return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 pr-6">
            <div className="flex items-center space-x-2">
              {getSeverityBadge(finding.severity)}
              <span className="font-mono text-xs text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Score: {finding.score}/100
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {finding.type.toUpperCase()} &bull; {finding.subtype}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">{finding.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 leading-relaxed">
          {finding.description}
        </div>

        {/* Source Traceability Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Column</span>
            <span className="font-semibold text-slate-900 truncate block mt-0.5">
              {finding.column || "Dataset-wide"}
            </span>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Row Reference</span>
            <span className="font-semibold text-slate-900 block mt-0.5">
              {finding.row_reference !== null && finding.row_reference !== undefined
                ? `Row #${finding.row_reference}`
                : "Aggregated"}
            </span>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Observed Value</span>
            <span className="font-semibold text-rose-800 truncate block mt-0.5">
              {formatValue(finding.observed_value)}
            </span>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Expected Value</span>
            <span className="font-semibold text-emerald-800 truncate block mt-0.5">
              {formatValue(finding.expected_value)}
            </span>
          </div>
        </div>

        {/* Expected Range & Deviation details */}
        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-slate-500">Detection Methods:</span>
            <div className="flex items-center space-x-1.5">
              {finding.detected_by.map((m, i) => (
                <Badge key={i} variant="outline" size="sm">
                  {m}
                </Badge>
              ))}
            </div>
          </div>

          {finding.expected_range && (
            <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200">
              <span className="text-slate-500">Expected Normal Range:</span>
              <span className="font-mono text-slate-900 font-medium">
                [{formatValue(finding.expected_range.lower)} — {formatValue(finding.expected_range.upper)}]
              </span>
            </div>
          )}

          {finding.deviation_percentage !== null && finding.deviation_percentage !== undefined && (
            <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200">
              <span className="text-slate-500">Relative Magnitude / Deviation:</span>
              <span className="font-mono text-amber-800 font-semibold">
                {finding.deviation_percentage > 0 ? `+${finding.deviation_percentage}%` : `${finding.deviation_percentage}%`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200">
            <span className="text-slate-500">Detection Confidence:</span>
            <span className="font-mono text-emerald-800 font-semibold">
              {(finding.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-1">
          <Button onClick={onClose} size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
