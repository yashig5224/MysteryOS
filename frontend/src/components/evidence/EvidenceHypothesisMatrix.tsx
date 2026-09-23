"use client";

import React, { useState } from "react";
import { Evidence, Hypothesis } from "@/types/evidence";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EvidenceHypothesisMatrixProps {
  evidence: Evidence[];
  hypotheses: Hypothesis[];
  onSelectHypothesis?: (hypothesis: Hypothesis) => void;
}

export function EvidenceHypothesisMatrix({ evidence, hypotheses, onSelectHypothesis }: EvidenceHypothesisMatrixProps) {
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>(
    hypotheses.length > 0 ? hypotheses[0].hypothesis_id : null
  );

  if (!hypotheses || hypotheses.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm font-mono text-slate-600 shadow-sm">
        No candidate hypotheses available to visualize.
      </div>
    );
  }

  const activeHypothesis = hypotheses.find((h) => h.hypothesis_id === selectedHypothesisId) || hypotheses[0];

  const supportingEvidence = evidence.filter((e) =>
    activeHypothesis.supporting_evidence_ids.includes(e.evidence_id)
  );

  const contradictingEvidence = evidence.filter((e) =>
    activeHypothesis.contradicting_evidence_ids.includes(e.evidence_id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900 font-mono uppercase tracking-tight">
            Evidence vs. Hypothesis Corroboration Matrix
          </h3>
          <p className="text-sm text-slate-600">
            Visual linking matrix connecting empirical evidence signals to candidate hypotheses
          </p>
        </div>
        <Badge variant="primary" size="md" className="font-mono text-xs px-3 py-1">
          {hypotheses.length} Candidate Formulations
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Candidate Hypotheses Selector */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider block">
            Select Candidate Hypothesis
          </span>
          <div className="space-y-3">
            {hypotheses.map((hyp) => {
              const isSelected = hyp.hypothesis_id === selectedHypothesisId;
              const hasContra = hyp.contradicting_evidence_ids.length > 0;

              return (
                <Card
                  key={hyp.hypothesis_id}
                  onClick={() => setSelectedHypothesisId(hyp.hypothesis_id)}
                  className={`p-5 space-y-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-teal-700 bg-teal-50/40 shadow-sm ring-1 ring-teal-700"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={hyp.confidence >= 80 ? "success" : hyp.confidence >= 50 ? "warning" : "danger"}
                      size="md"
                      className="font-mono text-xs"
                    >
                      {hyp.confidence}% CONFIDENCE
                    </Badge>

                    {hasContra && (
                      <Badge variant="warning" size="md" className="font-mono text-xs">
                        {hyp.contradicting_evidence_ids.length} Contradictions
                      </Badge>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{hyp.title}</h4>

                  <div className="flex justify-between items-center text-xs text-slate-600 font-mono pt-2 border-t border-slate-100">
                    <span>Supporting: <strong className="text-teal-800">{hyp.supporting_evidence_ids.length} signals</strong></span>
                    <span>Strength: <strong className="text-slate-900">{hyp.evidence_strength}/100</strong></span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: Visual Corroboration Wire Diagram for Selected Hypothesis */}
        <div className="lg:col-span-7">
          <Card className="p-6 bg-white border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
              <div>
                <span className="text-base font-bold text-slate-900 font-mono block">
                  {activeHypothesis.title}
                </span>
                <span className="text-xs text-slate-600 font-mono">
                  Base Evidence Strength: <strong className="text-teal-800">{activeHypothesis.evidence_strength}/100</strong>
                </span>
              </div>

              {onSelectHypothesis && (
                <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => onSelectHypothesis(activeHypothesis)}>
                  Inspect Details &rarr;
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-800 leading-relaxed font-mono">
              {activeHypothesis.statement}
            </div>

            {/* Supporting Evidence Items */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-teal-800 uppercase font-mono tracking-wider block">
                Supporting Evidence ({supportingEvidence.length})
              </span>
              {supportingEvidence.length > 0 ? (
                <div className="space-y-2.5">
                  {supportingEvidence.map((evi) => (
                    <div
                      key={evi.evidence_id}
                      className="flex items-start justify-between rounded-lg border border-teal-200 bg-teal-50/60 p-4 text-sm text-teal-950 space-x-3"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-teal-900 block text-base">{evi.title}</span>
                        <p className="text-xs text-teal-800 leading-relaxed">{evi.description}</p>
                      </div>
                      <Badge variant="success" size="md" className="shrink-0 font-mono text-xs">
                        {evi.strength}/100 STRENGTH
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic font-mono">No direct supporting evidence mapped.</p>
              )}
            </div>

            {/* Contradictory Evidence Items */}
            {contradictingEvidence.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-amber-800 uppercase font-mono tracking-wider block">
                  Contradictory Signals ({contradictingEvidence.length})
                </span>
                <div className="space-y-2.5">
                  {contradictingEvidence.map((evi) => (
                    <div
                      key={evi.evidence_id}
                      className="flex items-start justify-between rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-950 space-x-3"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-amber-900 block text-base">{evi.title}</span>
                        <p className="text-xs text-amber-800 leading-relaxed">{evi.description}</p>
                      </div>
                      <Badge variant="warning" size="md" className="shrink-0 font-mono text-xs">
                        CONTRADICTION
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

