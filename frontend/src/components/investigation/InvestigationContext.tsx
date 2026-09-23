import React from "react";
import { InvestigationThread, Hypothesis, EvidenceSummary } from "@/types/evidence";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InvestigationContextProps {
  evidenceSummary: EvidenceSummary | null;
  selectedThreadId?: string;
  onSelectThread?: (threadId: string) => void;
  onSelectHypothesis?: (hypothesis: Hypothesis) => void;
  onSelectThreadModal?: (thread: InvestigationThread) => void;
}

export function InvestigationContext({
  evidenceSummary,
  selectedThreadId,
  onSelectThread,
  onSelectHypothesis,
  onSelectThreadModal,
}: InvestigationContextProps) {
  if (!evidenceSummary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono uppercase text-slate-500">
            Active Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">
            Run Evidence Synthesis to activate contextual investigation threads and candidate hypotheses.
          </p>
        </CardContent>
      </Card>
    );
  }

  const threads = evidenceSummary.threads || [];
  const hypotheses = evidenceSummary.hypotheses || [];

  const activeThread =
    threads.find((t) => t.thread_id === selectedThreadId) || threads[0] || null;

  const focusHypothesis =
    activeThread && activeThread.hypothesis_ids?.length > 0
      ? hypotheses.find((h) => h.hypothesis_id === activeThread.hypothesis_ids[0]) || hypotheses[0]
      : hypotheses[0] || null;

  const totalSupporting =
    (evidenceSummary.evidence || []).filter((e) => e.polarity !== "contradict").length;
  const totalContradictions =
    (evidenceSummary.evidence || []).filter((e) => e.polarity === "contradict").length;

  return (
    <Card className="space-y-3">
      <CardHeader className="pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-700">
            Investigation Scope
          </CardTitle>
          {activeThread && (
            <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Priority: {activeThread.priority}/100
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-xs">
        {/* Thread Info */}
        {activeThread ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-mono uppercase">
                Active Thread:
              </span>
              <button
                onClick={() => onSelectThreadModal?.(activeThread)}
                className="text-teal-700 hover:text-teal-900 font-mono text-[11px] font-bold underline"
              >
                [{activeThread.thread_id.toUpperCase()}] Inspect
              </button>
            </div>
            <p className="text-slate-900 font-semibold text-xs leading-snug">
              {activeThread.title}
            </p>
            <p className="text-slate-600 line-clamp-2 leading-relaxed">{activeThread.summary}</p>
          </div>
        ) : (
          <p className="text-slate-500">General dataset exploration</p>
        )}

        {/* Hypothesis Info */}
        {focusHypothesis && (
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-bold text-[10px] uppercase font-mono">
                Primary Hypothesis
              </span>
              <button
                onClick={() => onSelectHypothesis?.(focusHypothesis)}
                className="text-teal-700 hover:text-teal-900 font-mono text-[10px] font-bold"
              >
                [{focusHypothesis.hypothesis_id.toUpperCase()}]
              </button>
            </div>
            <p className="text-slate-800 text-xs italic font-medium leading-relaxed">
              "{focusHypothesis.statement}"
            </p>
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
              <span>Confidence: {focusHypothesis.confidence}%</span>
              <span className="text-emerald-700 font-medium">
                {focusHypothesis.supporting_evidence_ids?.length || 0} Supporting Signals
              </span>
            </div>
          </div>
        )}

        {/* Evidence Metric Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Supporting</span>
            <span className="font-bold text-emerald-800 text-sm font-mono">
              {totalSupporting}
            </span>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Contradictions</span>
            <span className="font-bold text-rose-800 text-sm font-mono">
              {totalContradictions}
            </span>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Patterns</span>
            <span className="font-bold text-purple-800 text-sm font-mono">
              {activeThread?.pattern_ids?.length || 0}
            </span>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Findings</span>
            <span className="font-bold text-amber-800 text-sm font-mono">
              {activeThread?.finding_ids?.length || 0}
            </span>
          </div>
        </div>

        {/* Thread Selector if multiple */}
        {threads.length > 1 && (
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">
              Switch Thread Focus:
            </span>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {threads.map((t) => (
                <button
                  key={t.thread_id}
                  onClick={() => onSelectThread?.(t.thread_id)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between ${
                    (activeThread?.thread_id === t.thread_id)
                      ? "bg-teal-50 text-teal-900 border border-teal-300 font-semibold"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  <span className="truncate pr-2">{t.title}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {t.priority}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
