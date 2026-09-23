"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimelineEvent } from "@/types/patterns";

interface TrendTimeSeriesChartProps {
  title?: string;
  timelineEvents: TimelineEvent[];
}

export function TrendTimeSeriesChart({ title = "Temporal Sequence & Trend Trajectory", timelineEvents }: TrendTimeSeriesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timelineEvents || timelineEvents.length === 0) {
    return null;
  }

  // Generate normalized coordinates across events
  const points = timelineEvents.map((evt, idx) => {
    const xPct = timelineEvents.length > 1 ? (idx / (timelineEvents.length - 1)) * 88 + 6 : 50;
    const yPct = Math.min(80, Math.max(20, 100 - (evt.importance / 100) * 60 - 20));
    return {
      xPct,
      yPct,
      date: evt.date,
      title: evt.title,
      type: evt.event_type,
      column: evt.column,
      importance: evt.importance,
      description: evt.description,
    };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.xPct} ${pt.yPct}` : `${acc} L ${pt.xPct} ${pt.yPct}`;
  }, "");

  return (
    <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-6 hover:border-slate-300 transition-all">
      {/* Chart Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1.5">
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">{title}</h3>
          <p className="text-base text-slate-600">Chronological timeline sequence mapped across temporal dataset features</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="primary" size="md" className="text-sm px-4 py-1.5">
            {timelineEvents.length} MILESTONES
          </Badge>
        </div>
      </div>

      {/* SVG Time Series Interactive Graph — DOMINANT HEIGHT */}
      <div className="relative">
        <div className="chart-container chart-container-xl">
          <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ minHeight: "340px" }}>
            {/* Grid Lines */}
            <line x1="0" y1="25" x2="100" y2="25" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />

            {/* Time Series Connected Line — THICKER */}
            {points.length > 1 && (
              <path
                d={pathD}
                fill="none"
                stroke="#0f766e"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Event Markers — BIGGER */}
            {points.map((pt, i) => {
              const isAnomaly = pt.type.toLowerCase() === "anomaly";
              const isChange = pt.type.toLowerCase() === "change";
              return (
                <g key={i} className="cursor-pointer">
                  <circle
                    cx={`${pt.xPct}%`}
                    cy={`${pt.yPct}%`}
                    r={hoveredIndex === i ? "10" : "7"}
                    fill={isAnomaly ? "#b91c1c" : isChange ? "#d97706" : "#0f766e"}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="transition-all"
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              className="absolute z-20 top-4 rounded-lg bg-slate-900 text-white px-5 py-3 text-sm shadow-xl pointer-events-none transform -translate-x-1/2 space-y-1.5 border border-slate-700"
              style={{ left: `${points[hoveredIndex].xPct}%` }}
            >
              <div className="flex items-center space-x-3">
                <span className="font-bold text-teal-300 text-base">{points[hoveredIndex].date}</span>
                <span className="uppercase text-xs bg-slate-800 px-2.5 py-0.5 rounded text-slate-200 font-semibold">
                  {points[hoveredIndex].type}
                </span>
              </div>
              <p className="font-bold text-white text-base max-w-[300px] truncate">{points[hoveredIndex].title}</p>
              <p className="text-slate-300 text-sm">Importance Score: <strong className="text-teal-300">{points[hoveredIndex].importance}/100</strong></p>
            </div>
          )}
        </div>

        {/* X-Axis Date Labels */}
        <div className="flex justify-between items-center text-sm font-mono text-slate-700 mt-4 px-2 pt-2 border-t border-slate-100">
          {points.length > 0 && <span>Start: <strong>{points[0].date}</strong></span>}
          {points.length > 2 && <span>Midpoint: <strong>{points[Math.floor(points.length / 2)].date}</strong></span>}
          {points.length > 1 && <span>End: <strong>{points[points.length - 1].date}</strong></span>}
        </div>
      </div>
    </Card>
  );
}
