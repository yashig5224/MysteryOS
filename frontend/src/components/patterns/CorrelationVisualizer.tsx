"use client";

import React, { useState } from "react";
import { CorrelationPair } from "@/types/patterns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CorrelationVisualizerProps {
  correlations: CorrelationPair[];
}

export function CorrelationVisualizer({ correlations }: CorrelationVisualizerProps) {
  const [selectedPairIndex, setSelectedPairIndex] = useState<number>(0);

  if (!correlations || correlations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-base text-slate-600 shadow-sm">
        No statistically meaningful correlations (|r| &ge; 0.45) detected across numerical features.
      </div>
    );
  }

  const selectedPair = correlations[selectedPairIndex] || correlations[0];
  const isPositive = selectedPair.coefficient > 0;
  const absCoeff = Math.abs(selectedPair.coefficient);

  // Generate 20 simulated sample points matching the correlation direction for scatter plot visualization
  const scatterPoints = Array.from({ length: 20 }, (_, i) => {
    const normX = 10 + i * 4.2;
    const baseNormY = isPositive ? 15 + i * 3.6 : 85 - i * 3.6;
    // Add realistic dispersion inversely proportional to coefficient strength
    const dispersion = (1 - absCoeff) * 18 * (i % 2 === 0 ? 1 : -1);
    const normY = Math.min(85, Math.max(15, baseNormY + dispersion));
    return { xPct: normX, yPct: normY };
  });

  return (
    <div className="space-y-8">
      {/* Visual Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
            Discovered Numerical Associations ({correlations.length} Pairings)
          </h3>
          <p className="text-base text-slate-600 mt-1">
            Interactive pairwise correlation selector and 2D feature scatter plot analyzer
          </p>
        </div>
        <span className="text-sm text-slate-600 font-mono font-semibold bg-slate-100 px-4 py-1.5 rounded-md border border-slate-200">
          Threshold: |r| &ge; 0.45
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Pairwise Selection Grid */}
        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {correlations.map((corr, idx) => {
              const isSelected = idx === selectedPairIndex;
              const isPos = corr.coefficient > 0;
              const barWidth = Math.min(100, Math.round(Math.abs(corr.coefficient) * 100));

              return (
                <Card
                  key={idx}
                  onClick={() => setSelectedPairIndex(idx)}
                  className={`p-5 space-y-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-teal-700 bg-teal-50/40 shadow-sm ring-1 ring-teal-700"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="text-base font-bold text-slate-900">{corr.var1}</span>
                      <span className="text-sm text-slate-400 font-bold">&harr;</span>
                      <span className="text-base font-bold text-slate-900">{corr.var2}</span>
                    </div>
                    <Badge variant={isPos ? "primary" : "warning"} size="md" className="font-mono text-sm px-3">
                      r = {corr.coefficient > 0 ? `+${corr.coefficient.toFixed(2)}` : corr.coefficient.toFixed(2)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-mono text-slate-700">
                      <span>STRENGTH: <strong className="text-slate-900">{corr.strength.replace("_", " ").toUpperCase()}</strong></span>
                      <span>{barWidth}% alignment</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isPos ? "bg-teal-700" : "bg-amber-600"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 2D Interactive Scatter Plot Canvas — DOMINANT */}
        <div className="lg:col-span-8">
          <Card className="p-8 bg-white border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="text-xl font-extrabold text-slate-900 block">
                  {selectedPair.var1} <span className="text-slate-400 font-normal">vs</span> {selectedPair.var2}
                </span>
                <span className="text-base text-slate-600">
                  {isPositive ? "Positive Co-movement" : "Inverse Relationship"} &bull; {selectedPair.sample_size.toLocaleString()} samples evaluated
                </span>
              </div>
              <Badge variant={isPositive ? "success" : "warning"} size="md" className="font-mono text-sm px-4 py-1.5">
                Pearson r = {selectedPair.coefficient > 0 ? `+${selectedPair.coefficient.toFixed(2)}` : selectedPair.coefficient.toFixed(2)}
              </Badge>
            </div>

            {/* SVG Scatter Plot — MUCH TALLER */}
            <div className="chart-container chart-container-xl">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ minHeight: "380px" }}>
                {/* Grid Lines */}
                <line x1="10" y1="20" x2="90" y2="20" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
                <line x1="10" y1="50" x2="90" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
                <line x1="10" y1="80" x2="90" y2="80" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />

                {/* Trend Linear Regression Line */}
                <line
                  x1="10"
                  y1={isPositive ? "85" : "15"}
                  x2="90"
                  y2={isPositive ? "15" : "85"}
                  stroke={isPositive ? "#0f766e" : "#d97706"}
                  strokeWidth="3.5"
                  strokeDasharray="6,5"
                />

                {/* Sample Scatter Points — LARGER */}
                {scatterPoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={`${pt.xPct}%`}
                    cy={`${pt.yPct}%`}
                    r="7"
                    fill={isPositive ? "#0f766e" : "#d97706"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    opacity="0.9"
                  />
                ))}
              </svg>
            </div>

            <div className="flex justify-between items-center text-sm font-mono text-slate-700 pt-3 border-t border-slate-100">
              <span>X-Axis Feature: <strong className="text-slate-900">{selectedPair.var1}</strong></span>
              <span>Y-Axis Feature: <strong className="text-slate-900">{selectedPair.var2}</strong></span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
