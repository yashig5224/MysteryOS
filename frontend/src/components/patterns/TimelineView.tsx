"use client";

import React, { useState } from "react";
import { TimelineEvent } from "@/types/patterns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TimelineViewProps {
  timeline: TimelineEvent[];
  onSelectEvent?: (event: TimelineEvent) => void;
}

export function TimelineView({ timeline, onSelectEvent }: TimelineViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-sm">
        No chronological timeline events detected (requires temporal sequence features).
      </div>
    );
  }

  const getEventBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "anomaly":
        return <Badge variant="danger" size="sm">ANOMALY</Badge>;
      case "trend":
        return <Badge variant="success" size="sm">TREND</Badge>;
      case "change":
        return <Badge variant="warning" size="sm">STRUCTURAL SHIFT</Badge>;
      default:
        return <Badge variant="primary" size="sm">{type.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
            Chronological Investigation Timeline ({timeline.length} Milestones)
          </h3>
          <p className="text-xs text-slate-600">
            Sequential milestone chain tracing cause-and-effect transitions across temporal features
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Sorted Chronologically
        </span>
      </div>

      {/* Visual Step-Chain Swimlane */}
      <div className="relative border-l-2 border-teal-700 ml-4 space-y-5 pb-2">
        {timeline.map((evt, idx) => {
          const isExpanded = expandedId === (evt.event_id || String(idx));
          const key = evt.event_id || String(idx);

          return (
            <div key={key} className="relative pl-6 group">
              {/* Timeline Step Node Circle */}
              <div className="absolute -left-[9px] top-3 h-4 w-4 rounded-full border-2 border-white bg-teal-800 shadow-sm transition-transform group-hover:scale-125" />

              <Card className="p-4 bg-white border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                      {evt.date}
                    </span>
                    {getEventBadge(evt.event_type)}
                    {evt.column && (
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {evt.column}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs text-slate-600">
                      IMPORTANCE: <span className="font-bold text-slate-900">{evt.importance}/100</span>
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : key)}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                      title="Toggle details"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <h4
                  onClick={() => onSelectEvent?.(evt)}
                  className="text-sm font-bold text-slate-900 hover:text-teal-800 cursor-pointer transition-colors"
                >
                  {evt.title}
                </h4>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {evt.description}
                </p>

                {isExpanded && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 font-mono space-y-1">
                    <p>Event ID: <span className="text-slate-900 font-bold">{evt.event_id}</span></p>
                    {evt.source_finding_ids && evt.source_finding_ids.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span>Source Findings:</span>
                        {evt.source_finding_ids.map((fId) => (
                          <span key={fId} className="bg-slate-100 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                            {fId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
