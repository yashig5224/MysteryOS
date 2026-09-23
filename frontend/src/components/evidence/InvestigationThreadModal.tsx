"use client";

import React from "react";
import { X, CheckCircle2 } from "lucide-react";
import { InvestigationThread, Hypothesis, Evidence } from "@/types/evidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InvestigationThreadModalProps {
  thread: InvestigationThread | null;
  hypotheses?: Hypothesis[];
  evidence?: Evidence[];
  onClose: () => void;
  onSelectHypothesis?: (hypothesis: Hypothesis) => void;
}

export function InvestigationThreadModal({
  thread,
  hypotheses = [],
  evidence = [],
  onClose,
  onSelectHypothesis,
}: InvestigationThreadModalProps) {
  if (!thread) return null;

  const getPriorityBadge = (priority: number | string) => {
    const numPriority = typeof priority === "number" ? priority : 50;
    if (numPriority >= 80 || priority === "critical") {
      return (
        <span className="font-mono text-xs font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          PRIORITY: CRITICAL ({numPriority})
        </span>
      );
    }
    if (numPriority >= 60 || priority === "high") {
      return (
        <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          PRIORITY: HIGH ({numPriority})
        </span>
      );
    }
    return (
      <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
        PRIORITY: NORMAL ({numPriority})
      </span>
    );
  };

  const threadHypotheses = hypotheses.filter((h) =>
    thread.hypothesis_ids.includes(h.hypothesis_id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 pr-6">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <Badge variant="primary" size="md">
                INVESTIGATION THREAD
              </Badge>
              {getPriorityBadge(thread.priority)}
              <span className="text-xs text-slate-500 font-mono">
                Status: {thread.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">{thread.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Narrative Summary */}
        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-800 leading-relaxed space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-mono block font-bold">
            Synthesized Narrative
          </span>
          <p>{thread.summary}</p>
        </div>

        {/* Focal Features & Entities */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Core Focal Features
            </span>
            <div className="flex flex-wrap gap-1">
              {thread.primary_columns && thread.primary_columns.length > 0 ? (
                thread.primary_columns.map((col, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-xs font-semibold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.2 rounded"
                  >
                    {col}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic">Cross-metric synthesis</span>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Corroborating Evidence Items
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {thread.evidence_ids.length} Evidence Items
            </span>
            <p className="text-[10px] text-slate-500">
              Spans {thread.finding_ids.length} findings, {thread.pattern_ids.length} patterns, and{" "}
              {thread.timeline_event_ids.length} timeline events.
            </p>
          </div>
        </div>

        {/* Associated Hypotheses */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-800 font-mono uppercase">
            Candidate Hypotheses Under This Thread ({thread.hypothesis_ids.length})
          </div>

          <div className="space-y-2">
            {threadHypotheses.length > 0 ? (
              threadHypotheses.map((hyp) => (
                <div
                  key={hyp.hypothesis_id}
                  onClick={() => onSelectHypothesis && onSelectHypothesis(hyp)}
                  className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1 hover:border-slate-300 hover:bg-white cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{hyp.title}</span>
                    <span className="font-mono text-[11px] text-emerald-900 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      {hyp.confidence}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{hyp.statement}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                    <span>Supporting: {hyp.supporting_evidence_ids.length} items</span>
                    {hyp.contradicting_evidence_ids.length > 0 && (
                      <span className="text-amber-800 font-bold">
                        Contradictions: {hyp.contradicting_evidence_ids.length}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {thread.hypothesis_ids.map((id) => (
                  <span key={id} className="font-mono text-xs text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {id}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Investigation Next Steps */}
        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
          <div className="text-xs font-semibold text-slate-800 font-mono uppercase">
            Recommended Investigative Actions
          </div>
          <ul className="space-y-1 text-xs text-slate-700">
            <li className="flex items-start space-x-1.5">
              <span className="text-teal-700 font-bold">•</span>
              <span>Cross-reference operational logs around the identified timeline transition dates.</span>
            </li>
            <li className="flex items-start space-x-1.5">
              <span className="text-teal-700 font-bold">•</span>
              <span>Inspect segment cohort differences to evaluate if the phenomenon is regional vs universal.</span>
            </li>
            <li className="flex items-start space-x-1.5">
              <span className="text-teal-700 font-bold">•</span>
              <span>Perform root-cause sensitivity testing on primary coupling features.</span>
            </li>
          </ul>
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
