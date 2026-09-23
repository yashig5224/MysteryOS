"use client";

import React from "react";
import { X } from "lucide-react";
import { Pattern } from "@/types/patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PatternDetailModalProps {
  pattern: Pattern | null;
  onClose: () => void;
  onSelectFindingId?: (findingId: string) => void;
}

export function PatternDetailModal({
  pattern,
  onClose,
  onSelectFindingId,
}: PatternDetailModalProps) {
  if (!pattern) return null;

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "correlation":
        return <Badge variant="primary" size="md">CORRELATION</Badge>;
      case "trend":
        return <Badge variant="success" size="md">TREND TRAJECTORY</Badge>;
      case "group_difference":
        return <Badge variant="warning" size="md">SEGMENT DISPARITY</Badge>;
      case "change_point":
        return <Badge variant="danger" size="md">STRUCTURAL CHANGE</Badge>;
      case "cross_finding":
        return <Badge variant="secondary" size="md">FINDING CLUSTER</Badge>;
      default:
        return <Badge variant="outline" size="md">{type.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 pr-6">
            <div className="flex items-center space-x-2">
              {getTypeBadge(pattern.type)}
              <span className="font-mono text-xs text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Strength: {pattern.strength}/100
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Significance: {pattern.significance.toUpperCase()}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">{pattern.title}</h2>
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
          {pattern.description}
        </div>

        {/* Columns & Direction */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Involved Features</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {pattern.columns.map((col, idx) => (
                <span key={idx} className="font-mono font-semibold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[11px]">
                  {col}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Observed Trajectory / Direction</span>
            <span className="font-semibold text-amber-900 block mt-1 capitalize text-xs">
              {pattern.direction || "Associative"}
            </span>
          </div>
        </div>

        {/* Supporting Findings Traceability */}
        {pattern.supporting_finding_ids && pattern.supporting_finding_ids.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
            <div className="text-xs font-semibold text-slate-800 font-mono uppercase">
              Supporting Findings ({pattern.supporting_finding_ids.length})
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {pattern.supporting_finding_ids.map((fId) => (
                <span
                  key={fId}
                  className="font-mono text-xs text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded"
                >
                  {fId}
                </span>
              ))}
            </div>
          </div>
        )}

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
