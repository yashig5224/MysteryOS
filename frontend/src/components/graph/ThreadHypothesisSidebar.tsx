import React from "react";
import { Badge } from "@/components/ui/badge";
import { InvestigationThread, Hypothesis } from "@/types/evidence";

interface ThreadHypothesisSidebarProps {
  threads: InvestigationThread[];
  hypotheses: Hypothesis[];
  selectedThreadId: string | null;
  selectedHypothesisId: string | null;
  onSelectThread: (threadId: string | null) => void;
  onSelectHypothesis: (hypothesisId: string | null) => void;
  onOpenThreadModal?: (thread: InvestigationThread) => void;
  onOpenHypothesisModal?: (hypothesis: Hypothesis) => void;
}

export function ThreadHypothesisSidebar({
  threads,
  hypotheses,
  selectedThreadId,
  selectedHypothesisId,
  onSelectThread,
  onSelectHypothesis,
  onOpenThreadModal,
  onOpenHypothesisModal,
}: ThreadHypothesisSidebarProps) {
  const isFiltered = Boolean(selectedThreadId || selectedHypothesisId);

  return (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 text-slate-900 overflow-y-auto w-72 md:w-80 shadow-sm">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-mono">
          Investigation Scope
        </h3>
        {isFiltered && (
          <button
            onClick={() => {
              onSelectThread(null);
              onSelectHypothesis(null);
            }}
            className="text-[11px] font-mono text-teal-700 hover:text-teal-900 underline font-medium"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="p-3 space-y-5 flex-1">
        {/* Section 1: Investigation Threads */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Threads ({threads.length})
            </span>
          </div>

          <div className="space-y-1.5">
            {threads.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1">No threads synthesized yet.</p>
            ) : (
              threads.map((thread) => {
                const isSelected = selectedThreadId === thread.thread_id;
                return (
                  <div
                    key={thread.thread_id}
                    onClick={() => {
                      if (isSelected) {
                        onSelectThread(null);
                      } else {
                        onSelectThread(thread.thread_id);
                        onSelectHypothesis(null);
                      }
                    }}
                    className={`group rounded-md border p-2.5 cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/50 shadow-sm ring-1 ring-teal-600/40"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-800 uppercase px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                        {thread.thread_id}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[10px] text-amber-800 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          Score {thread.priority}
                        </span>
                        <Badge
                          variant={
                            thread.status === "active"
                              ? "success"
                              : thread.status === "open"
                              ? "primary"
                              : "secondary"
                          }
                          size="sm"
                          className="text-[9px] px-1 py-0 uppercase"
                        >
                          {thread.status}
                        </Badge>
                      </div>
                    </div>

                    <h5 className="text-xs font-semibold text-slate-900 leading-snug group-hover:text-teal-900 transition-colors line-clamp-2">
                      {thread.title}
                    </h5>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono border-t border-slate-100">
                      <span>{thread.hypothesis_ids?.length || 0} Hypotheses</span>
                      <span>{thread.evidence_ids?.length || 0} Evidence</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 2: Candidate Hypotheses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Hypotheses ({hypotheses.length})
            </span>
          </div>

          <div className="space-y-1.5">
            {hypotheses.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1">No candidate hypotheses available.</p>
            ) : (
              hypotheses.map((hyp) => {
                const isSelected = selectedHypothesisId === hyp.hypothesis_id;
                const hasContradiction = (hyp.contradicting_evidence_ids || []).length > 0;

                return (
                  <div
                    key={hyp.hypothesis_id}
                    onClick={() => {
                      if (isSelected) {
                        onSelectHypothesis(null);
                      } else {
                        onSelectHypothesis(hyp.hypothesis_id);
                        onSelectThread(null);
                      }
                    }}
                    className={`group rounded-md border p-2.5 cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/40"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-800 uppercase px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                        {hyp.hypothesis_id}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="font-mono text-[10px] text-slate-700 font-semibold">
                          {hyp.confidence}%
                        </span>
                        {hasContradiction && (
                          <Badge variant="danger" size="sm" className="text-[8px] px-1 py-0">
                            DISPUTED
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h6 className="text-xs font-medium text-slate-800 leading-snug group-hover:text-blue-900 transition-colors line-clamp-2">
                      {hyp.statement || hyp.title}
                    </h6>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
