import React from "react";
import { InvestigationSummary, InvestigationSource } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvestigationSources } from "@/components/investigation/InvestigationSources";
import { RefreshCw } from "lucide-react";

interface InvestigationSummaryCardProps {
  summary: InvestigationSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onSelectSource?: (source: InvestigationSource) => void;
  className?: string;
}

export function InvestigationSummaryCard({
  summary,
  loading,
  onRefresh,
  onSelectSource,
  className = "",
}: InvestigationSummaryCardProps) {
  if (loading && !summary) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-r-transparent mb-2" />
        <p className="text-xs text-slate-500">Synthesizing executive investigation synopsis...</p>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2.5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-teal-600" />
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-800">
              {summary.title || "Executive Investigation Synopsis"}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={
                summary.confidence === "high"
                  ? "success"
                  : summary.confidence === "moderate"
                  ? "primary"
                  : "warning"
              }
              size="sm"
            >
              Confidence: {summary.confidence.toUpperCase()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
              title="Refresh Synopsis"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-teal-700" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 space-y-3 text-xs">
        {/* Core Findings & Patterns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="rounded border border-amber-200 bg-amber-50/50 p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold text-amber-900 uppercase font-mono tracking-wider block">
              Primary Anomaly
            </span>
            <p className="text-slate-800 leading-snug font-medium text-xs">
              {summary.primary_anomaly || "No critical anomalies identified"}
            </p>
          </div>

          <div className="rounded border border-purple-200 bg-purple-50/50 p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold text-purple-900 uppercase font-mono tracking-wider block">
              Dominant Pattern
            </span>
            <p className="text-slate-800 leading-snug font-medium text-xs">
              {summary.important_pattern || "No dominant pattern identified"}
            </p>
          </div>
        </div>

        {/* Candidate Explanation */}
        <div className="rounded border border-blue-200 bg-blue-50/40 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-900 uppercase font-mono tracking-wider">
              Candidate Hypothesis & Plausibility
            </span>
            <div className="flex items-center space-x-2 text-[10px] font-mono">
              <span className="text-emerald-800 font-bold">
                +{summary.supporting_evidence_count} Supporting
              </span>
              <span className="text-rose-800 font-bold">
                -{summary.contradictory_evidence_count} Contradictory
              </span>
            </div>
          </div>
          <p className="text-slate-900 font-medium italic text-xs leading-relaxed">
            "{summary.candidate_explanation || summary.leading_hypothesis || "Under active investigation"}"
          </p>
        </div>

        {/* Recommended Next Step */}
        {summary.recommended_next_step && (
          <div className="rounded border border-emerald-200 bg-emerald-50/40 p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-900 uppercase font-mono tracking-wider block">
              Recommended Next Investigative Action
            </span>
            <p className="text-slate-800 font-medium text-xs leading-relaxed">
              {summary.recommended_next_step}
            </p>
          </div>
        )}

        {/* Key Sources */}
        {summary.key_sources && summary.key_sources.length > 0 && (
          <InvestigationSources
            sources={summary.key_sources}
            onSelectSource={onSelectSource}
          />
        )}
      </CardContent>
    </Card>
  );
}
