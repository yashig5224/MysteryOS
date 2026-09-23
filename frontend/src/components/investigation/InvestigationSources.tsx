import React from "react";
import { InvestigationSource } from "@/types/investigation";

interface InvestigationSourcesProps {
  sources: InvestigationSource[];
  onSelectSource?: (source: InvestigationSource) => void;
  className?: string;
}

export function InvestigationSources({
  sources,
  onSelectSource,
  className = "",
}: InvestigationSourcesProps) {
  if (!sources || sources.length === 0) return null;

  const getSourceBadgeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "evidence":
        return "bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100";
      case "pattern":
        return "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100";
      case "finding":
        return "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100";
      case "hypothesis":
        return "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100";
      case "timeline":
      case "event":
        return "bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100";
      case "thread":
        return "bg-cyan-50 text-cyan-900 border-cyan-200 hover:bg-cyan-100";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200";
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 pt-1.5 ${className}`}>
      <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono mr-1">
        Referenced Entities:
      </span>
      {sources.map((src, idx) => {
        const style = getSourceBadgeStyle(src.type);
        const displayId = src.id.toUpperCase();
        return (
          <button
            key={`${src.id}-${idx}`}
            onClick={() => onSelectSource?.(src)}
            className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-mono font-medium transition-all duration-150 cursor-pointer ${style}`}
            title={src.title || src.description || src.id}
          >
            <span>[{displayId}]</span>
            {src.title && (
              <span className="ml-1 text-[10px] opacity-80 truncate max-w-[140px]">
                {src.title}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
