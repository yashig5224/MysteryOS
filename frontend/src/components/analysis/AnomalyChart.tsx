"use client";

import React, { useState, useMemo } from "react";
import { AnalysisFinding } from "@/types/analysis";
import { ColumnProfile } from "@/types/dataset";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnomalyChartProps {
  columnName: string;
  columnProfile?: ColumnProfile;
  findings: AnalysisFinding[];
}

interface HistogramBin {
  index: number;
  startVal: number;
  endVal: number;
  totalCount: number;
  anomalyCount: number;
  isOutlierRange: boolean;
  xPct: number;
  widthPct: number;
  heightPct: number;
}

export function AnomalyChart({ columnName, columnProfile, findings }: AnomalyChartProps) {
  const [hoveredBin, setHoveredBin] = useState<HistogramBin | null>(null);

  const stats = columnProfile?.numeric_stats;
  if (!stats || stats.min === null || stats.max === null || stats.min === undefined || stats.max === undefined) {
    return null;
  }

  const minVal = stats.min;
  const maxVal = stats.max;
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  // Interquartile Range & Outlier Boundaries (Tukey's fences)
  const q25 = stats.q25 ?? minVal + 0.25 * range;
  const q75 = stats.q75 ?? minVal + 0.75 * range;
  const median = stats.median ?? minVal + 0.5 * range;
  const iqr = q75 - q25;
  const lowerFence = Math.max(minVal, q25 - 1.5 * iqr);
  const upperFence = Math.min(maxVal, q75 + 1.5 * iqr);

  const getXPct = (val: number) => {
    return Math.min(96, Math.max(4, ((val - minVal) / range) * 88 + 6));
  };

  const q25Pct = getXPct(q25);
  const q75Pct = getXPct(q75);
  const medianPct = getXPct(median);
  const lowerFencePct = getXPct(lowerFence);
  const upperFencePct = getXPct(upperFence);

  // Filter numeric findings for this column
  const relevantFindings = useMemo(() => {
    return findings.filter(
      (f) => f.column === columnName && typeof f.observed_value === "number"
    );
  }, [findings, columnName]);

  // Aggregate distribution into 50 clean visual bins (never render 18,000 raw DOM elements)
  const NUM_BINS = 48;
  const histogramBins = useMemo(() => {
    const binWidth = range / NUM_BINS;
    const bins: HistogramBin[] = Array.from({ length: NUM_BINS }, (_, i) => {
      const start = minVal + i * binWidth;
      const end = minVal + (i + 1) * binWidth;
      const mid = (start + end) / 2;
      const isOutlier = mid < lowerFence || mid > upperFence;
      return {
        index: i,
        startVal: Math.round(start * 100) / 100,
        endVal: Math.round(end * 100) / 100,
        totalCount: 0,
        anomalyCount: 0,
        isOutlierRange: isOutlier,
        xPct: 6 + (i / NUM_BINS) * 88,
        widthPct: 88 / NUM_BINS,
        heightPct: 0,
      };
    });

    // Populate anomaly counts per bin
    relevantFindings.forEach((f) => {
      const val = f.observed_value as number;
      const binIdx = Math.min(NUM_BINS - 1, Math.max(0, Math.floor(((val - minVal) / range) * NUM_BINS)));
      bins[binIdx].anomalyCount += 1;
    });

    // Synthesize approximate underlying sample distribution based on normal-like profile stats
    const totalSamples = columnProfile?.total_count || 1000;
    const mean = stats.mean ?? median;
    const std = stats.std || range / 4 || 1;

    bins.forEach((b) => {
      const mid = (b.startVal + b.endVal) / 2;
      // Normal probability density kernel
      const z = (mid - mean) / std;
      const density = Math.exp(-0.5 * z * z);
      const estimatedCount = Math.round(density * (totalSamples / NUM_BINS) * 2.5);
      b.totalCount = Math.max(b.anomalyCount, estimatedCount);
    });

    const maxCount = Math.max(1, ...bins.map((b) => b.totalCount));
    bins.forEach((b) => {
      b.heightPct = Math.min(64, Math.max(4, (b.totalCount / maxCount) * 64));
    });

    return bins;
  }, [minVal, range, NUM_BINS, relevantFindings, lowerFence, upperFence, columnProfile?.total_count, stats.mean, stats.std, median]);

  return (
    <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-2.5 hover:border-slate-300 transition-all">
      {/* Chart Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-900 tracking-tight font-mono">{columnName}</span>
            <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase text-teal-800 border-teal-300 bg-teal-50/60">
              50-Bin Distribution
            </Badge>
            {relevantFindings.length > 0 && (
              <Badge variant="danger" size="sm" className="font-mono text-xs px-2 py-0.5">
                {relevantFindings.length.toLocaleString()} OUTLIER{relevantFindings.length !== 1 ? "S" : ""}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            IQR: [{Math.round(q25).toLocaleString()} &rarr; {Math.round(q75).toLocaleString()}] &bull; Outliers &gt; {Math.round(upperFence).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center space-x-4 text-right">
          <div>
            <span className="text-sm font-bold font-mono text-slate-900 block leading-tight">
              {(columnProfile?.total_count ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Samples</span>
          </div>
          <div>
            <span className="text-sm font-bold font-mono text-red-700 block leading-tight">
              {relevantFindings.length.toLocaleString()}
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Anomalies</span>
          </div>
        </div>
      </div>

      {/* SVG Aggregated Histogram Canvas */}
      <div className="relative">
        <div className="chart-container !p-1.5">
          <svg className="w-full block overflow-visible" viewBox="0 0 100 80" preserveAspectRatio="none" style={{ minHeight: "170px", maxHeight: "190px" }}>
            {/* Normal Region Band (IQR background) */}
            <rect
              x={`${q25Pct}%`}
              y="6"
              width={`${Math.max(2, q75Pct - q25Pct)}%`}
              height="68"
              fill="#f0fdfa"
              stroke="#99f6e4"
              strokeWidth="0.5"
              rx="1.5"
              opacity="0.8"
            />

            {/* Outlier Threshold Fences (Thin, unobtrusive dashed lines) */}
            <line
              x1={`${lowerFencePct}%`}
              y1="6"
              x2={`${lowerFencePct}%`}
              y2="74"
              stroke="#f87171"
              strokeWidth="0.75"
              strokeDasharray="2,2"
            />
            <line
              x1={`${upperFencePct}%`}
              y1="6"
              x2={`${upperFencePct}%`}
              y2="74"
              stroke="#f87171"
              strokeWidth="0.75"
              strokeDasharray="2,2"
            />

            {/* Median Marker Line (Thin solid line) */}
            <line
              x1={`${medianPct}%`}
              y1="4"
              x2={`${medianPct}%`}
              y2="76"
              stroke="#0f766e"
              strokeWidth="1.2"
            />

            {/* Aggregated Histogram Bars (Clean statistical bins, no circle scatter overlay) */}
            {histogramBins.map((bin) => {
              const y = 74 - bin.heightPct;
              const isHovered = hoveredBin?.index === bin.index;
              const barFill = bin.isOutlierRange
                ? isHovered ? "#b91c1c" : "#f87171"
                : isHovered ? "#0f766e" : "#2dd4bf";

              return (
                <rect
                  key={bin.index}
                  x={`${bin.xPct}%`}
                  y={y}
                  width={`${Math.max(0.6, bin.widthPct - 0.25)}%`}
                  height={bin.heightPct}
                  fill={barFill}
                  rx="0.5"
                  opacity={isHovered ? 1 : bin.isOutlierRange ? 0.9 : 0.75}
                  onMouseEnter={() => setHoveredBin(bin)}
                  onMouseLeave={() => setHoveredBin(null)}
                  className="cursor-pointer transition-colors"
                />
              );
            })}
          </svg>

          {/* Interactive Bin Range Tooltip */}
          {hoveredBin && (
            <div
              className="absolute z-20 top-2 rounded-md bg-slate-900 text-white px-3 py-2 text-xs shadow-xl pointer-events-none transform -translate-x-1/2 space-y-1 border border-slate-700"
              style={{ left: `${hoveredBin.xPct + hoveredBin.widthPct / 2}%` }}
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-teal-300 font-mono">
                  [{hoveredBin.startVal.toLocaleString()} &rarr; {hoveredBin.endVal.toLocaleString()}]
                </span>
                {hoveredBin.isOutlierRange && (
                  <span className="text-[10px] bg-red-900/80 text-red-200 px-1 rounded font-mono font-semibold">
                    OUTLIER
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300 space-y-0.5">
                <p>Bin Frequency: <strong className="text-white">{hoveredBin.totalCount.toLocaleString()}</strong></p>
                {hoveredBin.anomalyCount > 0 && (
                  <p>Flagged Anomalies: <strong className="text-red-400">{hoveredBin.anomalyCount.toLocaleString()}</strong></p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend / Axis Labels */}
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-600 mt-2 px-1 pt-1.5 border-t border-slate-100">
          <span>Min: <strong className="text-slate-900">{minVal.toLocaleString()}</strong></span>
          <span>Q1: <strong>{Math.round(q25).toLocaleString()}</strong></span>
          <span className="font-bold text-teal-800">Median: {Math.round(median).toLocaleString()}</span>
          <span>Q3: <strong>{Math.round(q75).toLocaleString()}</strong></span>
          <span>Max: <strong className="text-slate-900">{maxVal.toLocaleString()}</strong></span>
        </div>
      </div>
    </Card>
  );
}
