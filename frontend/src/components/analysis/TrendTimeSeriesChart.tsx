"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimelineEvent } from "@/types/patterns";

interface TrendTimeSeriesChartProps {
  title?: string;
  timelineEvents: TimelineEvent[];
}

interface TimeBucket {
  index: number;
  label: string;
  timestamp: number;
  count: number;
  anomalyCount: number;
  topTitle: string;
  maxImportance: number;
  xPct: number;
  yPct: number;
}

export function TrendTimeSeriesChart({
  title = "Temporal Sequence & Milestones",
  timelineEvents,
}: TrendTimeSeriesChartProps) {
  const [hoveredBucket, setHoveredBucket] = useState<TimeBucket | null>(null);

  if (!timelineEvents || timelineEvents.length === 0) {
    return null;
  }

  // Parse and sort all timestamps chronologically
  const {
    buckets,
    bucketType,
    startDateLabel,
    midDateLabel,
    endDateLabel,
    totalEvents,
    maxBucketCount,
    yTicks,
  } = useMemo(() => {
    interface ParsedEntry {
      date: Date;
      timestamp: number;
      event: TimelineEvent;
    }

    const parsed: ParsedEntry[] = [];
    for (const evt of timelineEvents) {
      if (!evt.date) continue;
      const d = new Date(evt.date);
      if (!isNaN(d.getTime())) {
        parsed.push({
          date: d,
          timestamp: d.getTime(),
          event: evt,
        });
      }
    }

    if (parsed.length === 0) {
      return {
        buckets: [],
        bucketType: "None",
        startDateLabel: "",
        midDateLabel: "",
        endDateLabel: "",
        totalEvents: 0,
        maxBucketCount: 0,
        yTicks: [],
      };
    }

    // Sort chronologically
    parsed.sort((a, b) => a.timestamp - b.timestamp);

    const minTs = parsed[0].timestamp;
    const maxTs = parsed[parsed.length - 1].timestamp;
    const daySpan = Math.max(1, (maxTs - minTs) / (1000 * 60 * 60 * 24));

    // Bucket selection logic based on total date range:
    // < 7 days    → hourly
    // 7–90 days   → daily
    // 90–730 days → weekly
    // > 730 days  → monthly
    let bType: "hourly" | "daily" | "weekly" | "monthly" = "monthly";
    if (daySpan < 7) {
      bType = "hourly";
    } else if (daySpan <= 90) {
      bType = "daily";
    } else if (daySpan <= 730) {
      bType = "weekly";
    } else {
      bType = "monthly";
    }

    const getKey = (d: Date): { key: string; label: string; ts: number } => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hour = String(d.getHours()).padStart(2, "0");

      if (bType === "hourly") {
        return {
          key: `${year}-${month}-${day} ${hour}:00`,
          label: `${month}/${day} ${hour}:00`,
          ts: new Date(year, d.getMonth(), d.getDate(), d.getHours()).getTime(),
        };
      }
      if (bType === "daily") {
        return {
          key: `${year}-${month}-${day}`,
          label: `${month}/${day}/${year}`,
          ts: new Date(year, d.getMonth(), d.getDate()).getTime(),
        };
      }
      if (bType === "weekly") {
        const dayOfWeek = d.getDay();
        const diff = d.getDate() - dayOfWeek;
        const weekStart = new Date(d);
        weekStart.setDate(diff);
        const wYear = weekStart.getFullYear();
        const wMonth = String(weekStart.getMonth() + 1).padStart(2, "0");
        const wDay = String(weekStart.getDate()).padStart(2, "0");
        return {
          key: `W-${wYear}-${wMonth}-${wDay}`,
          label: `Wk ${wMonth}/${wDay}`,
          ts: weekStart.getTime(),
        };
      }
      return {
        key: `${year}-${month}`,
        label: `${year}-${month}`,
        ts: new Date(year, d.getMonth(), 1).getTime(),
      };
    };

    // Aggregate into temporal buckets
    const bucketMap = new Map<string, {
      label: string;
      ts: number;
      count: number;
      anomalyCount: number;
      topTitle: string;
      maxImportance: number;
    }>();

    for (const item of parsed) {
      const { key, label, ts } = getKey(item.date);
      let entry = bucketMap.get(key);
      if (!entry) {
        entry = {
          label,
          ts,
          count: 0,
          anomalyCount: 0,
          topTitle: item.event.title,
          maxImportance: item.event.importance || 0,
        };
        bucketMap.set(key, entry);
      }
      entry.count += 1;
      if (item.event.event_type === "anomaly" || item.event.importance >= 70) {
        entry.anomalyCount += 1;
      }
      if (item.event.importance > entry.maxImportance) {
        entry.maxImportance = item.event.importance;
        entry.topTitle = item.event.title;
      }
    }

    const sortedBucketList = Array.from(bucketMap.values()).sort((a, b) => a.ts - b.ts);
    const maxCount = Math.max(1, ...sortedBucketList.map((b) => b.count));
    const totalBuckets = sortedBucketList.length;

    // X axis span: 14% (after Y-axis) to 96%
    // Y axis span: 78 (bottom) to 14 (top)
    const finalBuckets: TimeBucket[] = sortedBucketList.map((b, idx) => {
      const xPct = totalBuckets > 1 ? 14 + (idx / (totalBuckets - 1)) * 82 : 55;
      const heightFrac = b.count / maxCount;
      const yPct = 78 - heightFrac * 62;
      return {
        index: idx,
        label: b.label,
        timestamp: b.ts,
        count: b.count,
        anomalyCount: b.anomalyCount,
        topTitle: b.topTitle,
        maxImportance: b.maxImportance,
        xPct,
        yPct,
      };
    });

    const formatShortDate = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const midIdx = Math.floor(parsed.length / 2);
    const sDate = formatShortDate(parsed[0].date);
    const mDate = formatShortDate(parsed[midIdx].date);
    const eDate = formatShortDate(parsed[parsed.length - 1].date);

    // Y-axis tick values
    const ticks = [
      { yPct: 16, val: maxCount },
      { yPct: 47, val: Math.round(maxCount / 2) },
      { yPct: 78, val: 0 },
    ];

    return {
      buckets: finalBuckets,
      bucketType: bType,
      startDateLabel: sDate,
      midDateLabel: mDate,
      endDateLabel: eDate,
      totalEvents: parsed.length,
      maxBucketCount: maxCount,
      yTicks: ticks,
    };
  }, [timelineEvents]);

  // Construct one continuous SVG line path connecting all 61 buckets
  const linePath = useMemo(() => {
    if (buckets.length === 0) return "";
    if (buckets.length === 1) {
      return `M ${buckets[0].xPct} ${buckets[0].yPct}`;
    }
    const pointsStr = buckets.map((b) => `${b.xPct.toFixed(2)},${b.yPct.toFixed(2)}`).join(" L ");
    return `M ${pointsStr}`;
  }, [buckets]);

  return (
    <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-2.5 hover:border-slate-300 transition-all">
      {/* Chart Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase font-mono">{title}</h3>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono uppercase text-teal-800 border-teal-300 bg-teal-50/60">
              {bucketType} Line
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {buckets.length} monthly intervals &bull; Trend trajectory across temporal domain
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="primary" size="sm" className="text-xs font-mono px-2.5 py-0.5">
            {totalEvents.toLocaleString()} RECORDS
          </Badge>
        </div>
      </div>

      {/* SVG Clean Line Chart Canvas (No heavy area, no large circles) */}
      <div className="relative">
        <div className="chart-container !p-1.5">
          <svg
            className="w-full block overflow-visible"
            viewBox="0 0 100 88"
            preserveAspectRatio="none"
            style={{ minHeight: "170px", maxHeight: "190px" }}
          >
            {/* Subtle Horizontal Grid Lines & Y-Axis Ticks */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1="14"
                  y1={tick.yPct}
                  x2="97"
                  y2={tick.yPct}
                  stroke={i === 2 ? "#cbd5e1" : "#f1f5f9"}
                  strokeWidth={i === 2 ? "0.8" : "0.5"}
                  strokeDasharray={i === 2 ? "none" : "2,2"}
                />
                <text
                  x="12"
                  y={tick.yPct + 1}
                  fill="#94a3b8"
                  fontSize="3"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {tick.val >= 1000 ? `${(tick.val / 1000).toFixed(1)}k` : tick.val}
                </text>
              </g>
            ))}

            {/* Y-Axis Label */}
            <text
              x="3.5"
              y="47"
              fill="#64748b"
              fontSize="2.8"
              fontFamily="monospace"
              fontWeight="600"
              textAnchor="middle"
              transform="rotate(-90, 3.5, 47)"
            >
              EVENT COUNT
            </text>

            {/* One Continuous Clean Line connecting all monthly data points */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#0f766e"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Invisible Hit Targets for Hover Tooltips + Subtle Hover-Only Marker */}
            {buckets.map((b) => {
              const isHovered = hoveredBucket?.index === b.index;
              return (
                <g key={b.index} className="cursor-pointer">
                  {/* Invisible hit box for smooth cursor tracking */}
                  <rect
                    x={`${b.xPct - 1.2}%`}
                    y="14"
                    width="2.4%"
                    height="66"
                    fill="transparent"
                    onMouseEnter={() => setHoveredBucket(b)}
                    onMouseLeave={() => setHoveredBucket(null)}
                  />

                  {/* Subtle point marker ONLY visible on hover */}
                  {isHovered && (
                    <g pointerEvents="none">
                      <line
                        x1={`${b.xPct}%`}
                        y1="16"
                        x2={`${b.xPct}%`}
                        y2="78"
                        stroke="#0f766e"
                        strokeWidth="0.6"
                        strokeDasharray="1.5,1.5"
                      />
                      <circle
                        cx={`${b.xPct}%`}
                        cy={`${b.yPct}%`}
                        r="2.5"
                        fill="#0f766e"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip on Hover */}
          {hoveredBucket && (
            <div
              className="absolute z-20 top-2 rounded-md bg-slate-900 text-white px-3 py-2 text-xs shadow-xl pointer-events-none transform -translate-x-1/2 space-y-0.5 border border-slate-700"
              style={{ left: `${hoveredBucket.xPct}%` }}
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-teal-300 font-mono text-xs">{hoveredBucket.label}</span>
                <span className="text-[10px] bg-teal-900/60 text-teal-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                  {hoveredBucket.count.toLocaleString()} Events
                </span>
              </div>
              <p className="text-slate-300 text-[11px] truncate max-w-[220px]">{hoveredBucket.topTitle}</p>
            </div>
          )}
        </div>

        {/* X-Axis Date Range Labels */}
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-600 mt-2 px-1 pt-1.5 border-t border-slate-100">
          <span>Start: <strong className="text-slate-900">{startDateLabel}</strong></span>
          <span>Mid: <strong>{midDateLabel}</strong></span>
          <span>End: <strong className="text-slate-900">{endDateLabel}</strong></span>
        </div>
      </div>
    </Card>
  );
}
