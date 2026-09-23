"use client";

import React from "react";
import { Relationship } from "@/types/patterns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface RelationshipListProps {
  relationships: Relationship[];
}

export function RelationshipList({ relationships }: RelationshipListProps) {
  if (!relationships || relationships.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-sm">
        No inter-variable or temporal relationships discovered.
      </div>
    );
  }

  const getRelBadge = (relType: string) => {
    switch (relType) {
      case "CORRELATES_WITH":
        return <Badge variant="primary" size="sm" className="font-mono text-[10px]">CORRELATES_WITH</Badge>;
      case "OCCURS_BEFORE":
        return <Badge variant="warning" size="sm" className="font-mono text-[10px]">OCCURS_BEFORE</Badge>;
      case "ASSOCIATED_WITH":
        return <Badge variant="success" size="sm" className="font-mono text-[10px]">ASSOCIATED_WITH</Badge>;
      case "CHANGES_WITH":
        return <Badge variant="secondary" size="sm" className="font-mono text-[10px]">CHANGES_WITH</Badge>;
      default:
        return <Badge variant="outline" size="sm" className="font-mono text-[10px]">{relType}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono">
          Discovered Relationship Network ({relationships.length})
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">
          Mapped inter-variable, group, and temporal associations
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {relationships.map((rel) => (
          <Card
            key={rel.relationship_id}
            className="p-3.5 space-y-2"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900">
                <span className="font-mono text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  {rel.source}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                {getRelBadge(rel.relationship_type)}
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  {rel.target}
                </span>
              </div>

              <span className="font-mono text-xs text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-medium">
                Strength: {rel.strength}%
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{rel.description}</p>

            {(rel.supporting_finding_ids.length > 0 || rel.supporting_pattern_ids.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                <span>Traceability:</span>
                {rel.supporting_finding_ids.map((fId) => (
                  <span key={fId} className="bg-slate-50 border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                    {fId}
                  </span>
                ))}
                {rel.supporting_pattern_ids.map((pId) => (
                  <span key={pId} className="bg-purple-50 border border-purple-200 text-purple-900 px-1.5 py-0.2 rounded">
                    {pId}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
