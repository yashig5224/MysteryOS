"use client";

import React, { useState } from "react";
import { X, ShieldAlert, ShieldCheck } from "lucide-react";
import { Hypothesis, Evidence } from "@/types/evidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HypothesisDetailModalProps {
  hypothesis: Hypothesis | null;
  allEvidence?: Evidence[];
  onClose: () => void;
  onSelectEvidence?: (evidenceId: string) => void;
}

export function HypothesisDetailModal({
  hypothesis,
  allEvidence = [],
  onClose,
  onSelectEvidence,
}: HypothesisDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "support" | "contradictions">("overview");

  if (!hypothesis) return null;

  const supportingItems = allEvidence.filter((e) =>
    hypothesis.supporting_evidence_ids.includes(e.evidence_id)
  );
  const contradictingItems = allEvidence.filter((e) =>
    hypothesis.contradicting_evidence_ids.includes(e.evidence_id)
  );

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) {
      return (
        <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Confidence: {score}% (High)
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Confidence: {score}% (Moderate)
        </span>
      );
    }
    return (
      <span className="font-mono text-xs font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
        Confidence: {score}% (Disputed)
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 pr-6">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <Badge variant="primary" size="md">
                CANDIDATE HYPOTHESIS
              </Badge>
              {getConfidenceBadge(hypothesis.confidence)}
              <span className="text-xs text-slate-500 font-mono">
                Status: {hypothesis.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">{hypothesis.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Statement / Premise */}
        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-800 leading-relaxed space-y-1">
          <div className="font-bold text-[11px] text-slate-700 uppercase font-mono">
            Hypothesis Premise
          </div>
          <p className="italic font-medium">{hypothesis.statement}</p>
        </div>

        {/* Sub Navigation */}
        <div className="flex border-b border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-teal-700 text-teal-900 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Investigation Reasoning
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`px-3 py-1.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === "support"
                ? "border-emerald-700 text-emerald-900 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Supporting Evidence ({hypothesis.supporting_evidence_ids.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("contradictions")}
            className={`px-3 py-1.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === "contradictions"
                ? "border-amber-700 text-amber-900 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Contradictions ({hypothesis.contradicting_evidence_ids.length})</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-3 text-xs">
            <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">
                Empirical Reasoning &amp; Traceability
              </span>
              <p className="text-slate-800 leading-relaxed">{hypothesis.reasoning}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Target Features
                </span>
                <div className="flex flex-wrap gap-1">
                  {hypothesis.primary_columns.length > 0 ? (
                    hypothesis.primary_columns.map((col, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[11px] font-semibold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.2 rounded"
                      >
                        {col}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">System-wide / Cross-feature</span>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Base Evidence Strength
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {hypothesis.evidence_strength}/100
                </span>
              </div>
            </div>

            {hypothesis.supporting_pattern_ids.length > 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Associated Patterns ({hypothesis.supporting_pattern_ids.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {hypothesis.supporting_pattern_ids.map((patId) => (
                    <span
                      key={patId}
                      className="font-mono text-xs text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded"
                    >
                      {patId}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Supporting Evidence */}
        {activeTab === "support" && (
          <div className="space-y-2.5">
            {supportingItems.length > 0 ? (
              supportingItems.map((evi) => (
                <div
                  key={evi.evidence_id}
                  className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{evi.title}</span>
                    <span className="font-mono text-[11px] text-emerald-900 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      Strength: {evi.strength}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{evi.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono border-t border-slate-100">
                    <span>Type: {evi.evidence_type}</span>
                    <span>Features: {evi.columns.join(", ") || "General"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                {hypothesis.supporting_evidence_ids.map((id) => (
                  <span key={id} className="font-mono text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded mr-2">
                    {id}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Contradictory Evidence */}
        {activeTab === "contradictions" && (
          <div className="space-y-2.5">
            {contradictingItems.length > 0 ? (
              contradictingItems.map((evi) => (
                <div
                  key={evi.evidence_id}
                  className="rounded-md border border-rose-200 bg-rose-50/50 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center space-x-1">
                      <span>{evi.title}</span>
                    </span>
                    <span className="font-mono text-[11px] text-rose-900 bg-white px-2 py-0.2 rounded border border-rose-200 font-bold">
                      Strength: {evi.strength}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{evi.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono border-t border-rose-100">
                    <span>Polarity: CONTRADICTS / LIMITS</span>
                    <span>Features: {evi.columns.join(", ") || "General"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">No empirical contradictions detected.</p>
                <p className="text-[11px] text-slate-500">
                  All current segment invariants remain aligned with this candidate premise.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notice */}
        <div className="rounded-md bg-slate-50 p-2.5 border border-slate-200 text-[11px] text-slate-600">
          Candidate hypotheses represent statistically consistent empirical formulations, not confirmed or definitive causality.
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
