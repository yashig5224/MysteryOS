import React from "react";
import { Search, Filter, Layers, ShieldAlert, RotateCcw, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GraphControlsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTypeFilter: string;
  onTypeFilterChange: (type: string) => void;
  selectedThreadFilter: string;
  onThreadFilterChange: (threadId: string) => void;
  threads: string[];
  onlyContradictions: boolean;
  onToggleContradictions: () => void;
  nodeTypeCounts: Record<string, number>;
  totalNodes: number;
  totalEdges: number;
  onFitView: () => void;
  onResetLayout: () => void;
}

export function GraphControls({
  searchQuery,
  onSearchChange,
  activeTypeFilter,
  onTypeFilterChange,
  selectedThreadFilter,
  onThreadFilterChange,
  threads,
  onlyContradictions,
  onToggleContradictions,
  nodeTypeCounts,
  totalNodes,
  totalEdges,
  onFitView,
  onResetLayout,
}: GraphControlsProps) {
  const types = [
    { id: "all", label: "All Nodes", count: totalNodes },
    { id: "finding", label: "Findings", count: nodeTypeCounts["finding"] || 0 },
    { id: "pattern", label: "Patterns", count: nodeTypeCounts["pattern"] || 0 },
    { id: "evidence", label: "Evidence", count: nodeTypeCounts["evidence"] || 0 },
    { id: "hypothesis", label: "Hypotheses", count: nodeTypeCounts["hypothesis"] || 0 },
    { id: "thread", label: "Threads", count: nodeTypeCounts["thread"] || 0 },
    { id: "event", label: "Timeline", count: nodeTypeCounts["event"] || 0 },
  ];

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      {/* Top Bar: Search, Subgraph Dropdown, Contradiction Toggle, Zoom Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search nodes, IDs, columns..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 font-sans shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-mono"
            >
              ✕
            </button>
          )}
        </div>

        {/* Thread Subgraph Dropdown */}
        {threads && threads.length > 0 && (
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase font-mono">Scope:</span>
            <select
              value={selectedThreadFilter}
              onChange={(e) => onThreadFilterChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none shadow-sm"
            >
              <option value="all">All Threads ({threads.length})</option>
              {threads.map((tid) => (
                <option key={tid} value={tid}>
                  Thread: {tid.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Contradiction Filter Toggle */}
        <Button
          variant={onlyContradictions ? "danger" : "outline"}
          size="sm"
          onClick={onToggleContradictions}
          className={`text-xs h-7 px-2.5 ${
            onlyContradictions
              ? "bg-rose-700 text-white border-rose-800"
              : "border-rose-300 text-rose-800 hover:bg-rose-50"
          }`}
        >
          <span>Contradictions Only</span>
        </Button>

        {/* Graph View Tools */}
        <div className="flex items-center space-x-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onFitView}
            className="h-7 px-2.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
            title="Fit All Nodes in View"
          >
            <span>Fit View</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetLayout}
            className="h-7 px-2.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
            title="Reset Graph Layout Coordinates"
          >
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* Type Filter Pills & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-slate-500 mr-1 font-mono uppercase">
            Filter:
          </span>
          {types.map((t) => {
            const isActive = activeTypeFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTypeFilterChange(t.id)}
                className={`flex items-center space-x-1.5 rounded-md px-2 py-0.5 text-xs transition-all ${
                  isActive
                    ? "bg-teal-100 text-teal-900 border border-teal-300 font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-transparent"
                }`}
              >
                <span>{t.label}</span>
                <span className="rounded bg-white/70 px-1 text-[10px] font-mono text-slate-700">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
          <span>
            <strong className="text-slate-800">{totalNodes}</strong> Nodes
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-800">{totalEdges}</strong> Edges
          </span>
        </div>
      </div>
    </div>
  );
}
