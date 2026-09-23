"use client";

import React, { useState } from "react";
import { AnalysisFinding } from "@/types/analysis";
import { ColumnProfile } from "@/types/dataset";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnomalyChartProps {
  columnName: string;
  columnProfile?: ColumnProfile;
  findings: AnalysisFinding[];
}

export function AnomalyChart({ columnName, columnProfile, findings }: AnomalyChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    val: number;
    score: number;
    severity: string;
    row?: string | number | null;
    title: string;
    xPct: number;
  } | null>(null);

  const stats = columnProfile?.numeric_stats;
  if (!stats || stats.min === null || stats.max === null || stats.min === undefined || stats.max === undefined) {
    return null;
  }

  const minVal = stats.min;
  const maxVal = stats.max;
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  // Anomalous points for this column
  const anomalousPoints = findings
    .filter((f) => f.column === columnName && typeof f.observed_value === "number")
    .map((f) => {
      const val = f.observed_value as number;
      const xPct = Math.min(95, Math.max(5, ((val - minVal) / range) * 90 + 5));
      return {
        val,
        score: f.score,
        severity: f.severity,
        row: f.row_reference,
        title: f.title,
        xPct,
      };
    });

  const getX = (val: number) => {
    return Math.min(95, Math.max(5, ((val - minVal) / range) * 90 + 5));
  };

  const q25Pct = stats.q25 !== null && stats.q25 !== undefined ? getX(stats.q25) : 25;
  const q75Pct = stats.q75 !== null && stats.q75 !== undefined ? getX(stats.q75) : 75;
  const medianPct = stats.median !== null && stats.median !== undefined ? getX(stats.median) : 50;

  return (
    <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-6 hover:border-slate-300 transition-all">
      {/* Chart Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-4">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{columnName}</span>
            <Badge variant="danger" size="md" className="font-mono text-sm px-3 py-1">
              {anomalousPoints.length} OUTLIER{anomalousPoints.length !== 1 ? "S" : ""}
            </Badge>
          </div>
          <p className="text-base text-slate-600">
            IQR Range: [{stats.q25 ?? minVal} &rarr; {stats.q75 ?? maxVal}] &bull; Std Dev: {stats.std ?? "N/A"}
          </p>
        </div>

        <div className="flex items-center space-x-8 text-right">
          <div>
            <span className="kpi-figure text-slate-900 block">{columnProfile?.total_count ?? 0}</span>
            <span className="kpi-label block">Samples</span>
          </div>
          <div>
            <span className="kpi-figure text-red-700 block">{anomalousPoints.length}</span>
            <span className="kpi-label block">Anomalies</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Density & Outlier Canvas — DOMINANT HEIGHT */}
      <div className="relative">
        <div className="chart-container chart-container-xl">
          <svg className="h-full w-full overflow-visible" viewBox="0 0 100 80" preserveAspectRatio="none" style={{ minHeight: "280px" }}>
            {/* Background Normal Region Band (IQR) */}
            <rect
              x={`${q25Pct}%`}
              y="8"
              width={`${Math.max(3, q75Pct - q25Pct)}%`}
              height="64"
              fill="#ccfbf1"
              stroke="#99f6e4"
              strokeWidth="0.6"
              rx="4"
              opacity="0.85"
            />

            {/* Density Curve Path (Simulated Normal Density) */}
            <path
              d={`M 5 70 Q ${medianPct / 2} 60, ${q25Pct} 30 T ${medianPct} 12 T ${q75Pct} 30 Q ${(100 + q75Pct) / 2} 60, 95 70`}
              fill="none"
              stroke="#0d9488"
              strokeWidth="3"
              strokeDasharray="4,4"
              opacity="0.7"
            />

            {/* Median Line Marker */}
            <line
              x1={`${medianPct}%`}
              y1="8"
              x2={`${medianPct}%`}
              y2="72"
              stroke="#0f172a"
              strokeWidth="2.5"
            />

            {/* Outlier Data Dots — LARGER */}
            {anomalousPoints.map((pt, i) => (
              <g key={i} className="cursor-pointer">
                <circle
                  cx={`${pt.xPct}%`}
                  cy="40"
                  r="9"
                  fill="#b91c1c"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="transition-transform hover:scale-150"
                />
              </g>
            ))}
          </svg>

          {/* Hovered Outlier Rich Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-20 top-3 rounded-lg bg-slate-900 text-white px-5 py-3 text-sm shadow-xl pointer-events-none transform -translate-x-1/2 space-y-1 border border-slate-700"
              style={{ left: `${hoveredPoint.xPct}%` }}
            >
              <p className="font-bold text-teal-300 text-base truncate max-w-[280px]">{hoveredPoint.title}</p>
              <p className="text-slate-200">
                Observed: <span className="font-bold text-white">{hoveredPoint.val}</span> | Score: <span className="font-bold text-red-400">{hoveredPoint.score}/100</span>
              </p>
              {hoveredPoint.row && <p className="text-slate-400 text-xs">Dataset Row #{hoveredPoint.row}</p>}
            </div>
          )}
        </div>

        {/* Legend / Axis Labels */}
        <div className="flex justify-between items-center text-sm font-mono text-slate-700 mt-4 px-2 pt-2 border-t border-slate-100">
          <span>Min: <strong className="text-slate-900">{minVal.toLocaleString()}</strong></span>
          {stats.q25 !== null && stats.q25 !== undefined && (
            <span>Q1 (25%): <strong>{stats.q25.toLocaleString()}</strong></span>
          )}
          {stats.median !== null && stats.median !== undefined && (
            <span className="font-bold text-teal-800 text-base">Median: {stats.median.toLocaleString()}</span>
          )}
          {stats.q75 !== null && stats.q75 !== undefined && (
            <span>Q3 (75%): <strong>{stats.q75.toLocaleString()}</strong></span>
          )}
          <span>Max: <strong className="text-slate-900">{maxVal.toLocaleString()}</strong></span>
        </div>
      </div>
    </Card>
  );
}
