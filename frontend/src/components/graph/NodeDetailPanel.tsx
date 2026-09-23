import React from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { GraphNode, GraphEdge, GraphNodeDetailResponse } from "@/types/graph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NodeDetailPanelProps {
  nodeDetail: GraphNodeDetailResponse | null;
  loading: boolean;
  onClose: () => void;
  onSelectNeighbor: (nodeId: string) => void;
  onOpenEntityModal: (node: GraphNode) => void;
  onInvestigateWithAI: (query: string, threadId?: string) => void;
}

export function NodeDetailPanel({
  nodeDetail,
  loading,
  onClose,
  onSelectNeighbor,
  onOpenEntityModal,
  onInvestigateWithAI,
}: NodeDetailPanelProps) {
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500 bg-white border-l border-slate-200">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-r-transparent mb-2" />
        <p className="text-xs font-medium text-slate-600">Loading Neighborhood...</p>
      </div>
    );
  }

  if (!nodeDetail) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500 bg-slate-50/50 border-l border-slate-200 w-80 md:w-96">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">No Node Selected</p>
        <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
          Click any node in the knowledge graph to inspect its attributes, neighbors, and polarity.
        </p>
      </div>
    );
  }

  const { node, connected_nodes, connected_edges, related_threads } = nodeDetail;

  const isContradiction =
    node.polarity === "contradict" ||
    connected_edges.some((e) => e.polarity === "contradict");

  const buildAIQuery = () => {
    return `Investigate the context, cause, and evidence related to ${node.id.toUpperCase()}: "${node.title || node.label}"`;
  };

  return (
    <div className="flex h-full flex-col bg-white border-l border-slate-200 text-slate-900 overflow-y-auto w-80 md:w-96 shadow-sm">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-3.5">
        <div className="flex items-center space-x-2 truncate">
          <span className="font-mono text-xs font-bold text-slate-900 uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
            {node.id}
          </span>
          <Badge variant="outline" size="sm" className="capitalize text-[10px] font-mono">
            {node.type}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Contradiction Alert Banner */}
        {isContradiction && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 space-y-1">
            <div className="font-bold text-rose-900 uppercase tracking-wider text-[11px] font-mono">
              Contradiction Detected
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              This entity contains conflicting empirical evidence, highlighting a divergence between expected and observed behaviors.
            </p>
          </div>
        )}

        {/* Title & Description */}
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 leading-snug">
            {node.title || node.label}
          </h4>
          {node.description && (
            <p className="text-xs text-slate-600 leading-relaxed">
              {node.description}
            </p>
          )}
        </div>

        {/* Metrics & Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {node.severity && (
            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Severity</span>
              <div>
                <Badge
                  variant={
                    node.severity === "high"
                      ? "danger"
                      : node.severity === "medium"
                      ? "warning"
                      : "primary"
                  }
                  size="sm"
                >
                  {node.severity.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}

          {(node.confidence !== undefined || node.strength !== undefined) && (
            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono">
                {node.confidence !== undefined ? "Confidence" : "Strength"}
              </span>
              <div className="font-mono text-sm font-bold text-slate-900">
                {node.confidence ?? node.strength}/100
              </div>
            </div>
          )}

          {node.tier !== undefined && (
            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Hierarchy Tier</span>
              <div className="font-mono text-xs text-slate-700">
                Tier {node.tier} ({node.type})
              </div>
            </div>
          )}

          {node.polarity && (
            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Polarity</span>
              <div>
                <Badge
                  variant={
                    node.polarity === "contradict"
                      ? "danger"
                      : node.polarity === "support"
                      ? "success"
                      : "outline"
                  }
                  size="sm"
                  className="capitalize text-[10px]"
                >
                  {node.polarity}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Associated Columns */}
        {node.columns && node.columns.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-500">
              Features
            </span>
            <div className="flex flex-wrap gap-1">
              {node.columns.map((col) => (
                <span
                  key={col}
                  className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-mono text-slate-700"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons: Open Modal & AI Assistant */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onInvestigateWithAI(buildAIQuery(), related_threads?.[0])}
            className="w-full font-medium"
          >
            <span>Investigate with AI</span>
          </Button>

          {node.type !== "event" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenEntityModal(node)}
              className="w-full"
            >
              <span>View Full Details</span>
            </Button>
          )}
        </div>

        {/* Connected Neighborhood */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h5 className="text-[11px] font-bold text-slate-700 uppercase font-mono tracking-wider">
            Connected Neighborhood ({connected_nodes.length})
          </h5>

          {connected_nodes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No connected neighboring nodes in this view.</p>
          ) : (
            <div className="space-y-1.5">
              {connected_nodes.map((neighbor) => {
                const edge = connected_edges.find(
                  (e) =>
                    (e.source === node.id && e.target === neighbor.id) ||
                    (e.target === node.id && e.source === neighbor.id)
                );
                const isOutgoing = edge?.source === node.id;

                return (
                  <div
                    key={neighbor.id}
                    onClick={() => onSelectNeighbor(neighbor.id)}
                    className="group flex flex-col rounded-md border border-slate-200 bg-slate-50/50 p-2 hover:border-teal-500 hover:bg-white cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-900 group-hover:text-teal-800 transition-colors uppercase">
                        {neighbor.id}
                      </span>
                      <Badge variant="outline" size="sm" className="capitalize text-[9px] font-mono">
                        {neighbor.type}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-1">
                      {neighbor.title || neighbor.label}
                    </p>

                    {edge && (
                      <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-500">
                        {isOutgoing ? (
                          <ArrowRight className="h-3 w-3 text-teal-700" />
                        ) : (
                          <ArrowLeft className="h-3 w-3 text-purple-700" />
                        )}
                        <span className="text-slate-600">{edge.label}</span>
                        {edge.polarity === "contradict" && (
                          <Badge variant="danger" size="sm" className="text-[8px] px-1 py-0 ml-1">
                            CONTRADICTION
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
