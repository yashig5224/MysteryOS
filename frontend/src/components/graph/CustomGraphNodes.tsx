import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/badge";

export const CustomGraphNode = memo(({ data, selected }: NodeProps) => {
  const {
    id,
    label,
    type,
    title,
    description,
    severity,
    strength,
    confidence,
    polarity,
    isHighlighted,
    isDimmed,
  } = data;

  const getNodeStyling = (nodeType: string, nodePolarity?: string) => {
    switch (nodeType?.toLowerCase()) {
      case "finding":
        return {
          border: selected
            ? "border-amber-600 shadow-sm ring-2 ring-amber-500/40"
            : "border-amber-200 hover:border-amber-400",
          bg: "bg-white",
          tagBg: "bg-amber-50 text-amber-900 border border-amber-200",
          prefix: "FND",
        };
      case "pattern":
        return {
          border: selected
            ? "border-purple-600 shadow-sm ring-2 ring-purple-500/40"
            : "border-purple-200 hover:border-purple-400",
          bg: "bg-white",
          tagBg: "bg-purple-50 text-purple-900 border border-purple-200",
          prefix: "PAT",
        };
      case "evidence":
        if (nodePolarity === "contradict") {
          return {
            border: selected
              ? "border-rose-600 shadow-sm ring-2 ring-rose-500/40"
              : "border-rose-300 hover:border-rose-400",
            bg: "bg-rose-50/30",
            tagBg: "bg-rose-100 text-rose-900 border border-rose-300 font-bold",
            prefix: "EVD",
          };
        }
        return {
          border: selected
            ? "border-teal-600 shadow-sm ring-2 ring-teal-500/40"
            : "border-teal-200 hover:border-teal-400",
          bg: "bg-white",
          tagBg: "bg-teal-50 text-teal-900 border border-teal-200",
          prefix: "EVD",
        };
      case "hypothesis":
        return {
          border: selected
            ? "border-blue-600 shadow-sm ring-2 ring-blue-500/40"
            : "border-blue-200 hover:border-blue-400",
          bg: "bg-white",
          tagBg: "bg-blue-50 text-blue-900 border border-blue-200",
          prefix: "HYP",
        };
      case "thread":
        return {
          border: selected
            ? "border-cyan-700 shadow-sm ring-2 ring-cyan-600/40"
            : "border-cyan-200 hover:border-cyan-400",
          bg: "bg-white",
          tagBg: "bg-cyan-50 text-cyan-900 border border-cyan-200",
          prefix: "THR",
        };
      case "event":
        return {
          border: selected
            ? "border-orange-600 shadow-sm ring-2 ring-orange-500/40"
            : "border-orange-200 hover:border-orange-400",
          bg: "bg-white",
          tagBg: "bg-orange-50 text-orange-900 border border-orange-200",
          prefix: "EVT",
        };
      default:
        return {
          border: selected
            ? "border-slate-700 shadow-sm ring-2 ring-slate-500/40"
            : "border-slate-200 hover:border-slate-400",
          bg: "bg-white",
          tagBg: "bg-slate-100 text-slate-800 border border-slate-200",
          prefix: "NODE",
        };
    }
  };

  const style = getNodeStyling(type, polarity);
  const displayScore = confidence ?? strength;

  return (
    <div
      className={`relative w-60 rounded-md border p-2.5 shadow-sm transition-all duration-150 ${
        style.bg
      } ${style.border} ${
        isDimmed ? "opacity-25" : isHighlighted ? "opacity-100 ring-2 ring-teal-600 shadow-md" : "opacity-100"
      }`}
    >
      {/* React Flow Handles */}
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-slate-400 !w-2 !h-2" />

      {/* Node Header */}
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100">
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${style.tagBg}`}>
          {id.toUpperCase()}
        </span>
        {displayScore !== undefined && (
          <span className="text-[10px] font-mono text-slate-600 font-semibold">
            {displayScore}/100
          </span>
        )}
      </div>

      {/* Title & Description */}
      <div className="pt-1.5 space-y-0.5">
        <h5 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1">
          {title || label}
        </h5>
        {description && (
          <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
            {description}
          </p>
        )}
      </div>

      {/* Node Footer Badge */}
      <div className="flex items-center justify-between pt-1.5 text-[10px] text-slate-500">
        <span className="capitalize font-mono text-[10px]">
          {type}
        </span>
        <div className="flex items-center space-x-1">
          {severity && (
            <Badge
              variant={
                severity === "high" ? "danger" : severity === "medium" ? "warning" : "default"
              }
              size="sm"
              className="text-[9px] px-1 py-0 uppercase"
            >
              {severity}
            </Badge>
          )}
          {polarity === "contradict" && (
            <Badge variant="danger" size="sm" className="text-[9px] px-1 py-0 uppercase font-bold">
              Contradiction
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

CustomGraphNode.displayName = "CustomGraphNode";
