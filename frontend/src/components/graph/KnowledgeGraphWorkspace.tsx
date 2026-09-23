import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ReactFlowInstance } from "reactflow";
import {
  KnowledgeGraphResponse,
  GraphNodeDetailResponse,
  GraphNode,
  GraphEdge,
} from "@/types/graph";
import { EvidenceSummary, Hypothesis, InvestigationThread } from "@/types/evidence";
import { graphService } from "@/services/graphService";
import { GraphControls } from "./GraphControls";
import { ThreadHypothesisSidebar } from "./ThreadHypothesisSidebar";
import { InvestigationGraph } from "./InvestigationGraph";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KnowledgeGraphWorkspaceProps {
  datasetId: string;
  evidenceSummary?: EvidenceSummary | null;
  onInvestigateWithAI: (query: string, threadId?: string) => void;
  onSelectFindingModal?: (findingId: string) => void;
  onSelectPatternModal?: (patternId: string) => void;
  onSelectHypothesisModal?: (hypothesis: Hypothesis) => void;
  onSelectThreadModal?: (thread: InvestigationThread) => void;
}

export function KnowledgeGraphWorkspace({
  datasetId,
  evidenceSummary,
  onInvestigateWithAI,
  onSelectFindingModal,
  onSelectPatternModal,
  onSelectHypothesisModal,
  onSelectThreadModal,
}: KnowledgeGraphWorkspaceProps) {
  const [graphData, setGraphData] = useState<KnowledgeGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Node State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetail, setNodeDetail] = useState<GraphNodeDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");
  const [selectedThreadFilter, setSelectedThreadFilter] = useState("all");
  const [selectedHypothesisFilter, setSelectedHypothesisFilter] = useState<string | null>(null);
  const [onlyContradictions, setOnlyContradictions] = useState(false);

  // React Flow Instance Ref for camera controls
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Load Graph Data
  const loadGraph = useCallback(async () => {
    if (!datasetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await graphService.getKnowledgeGraph(datasetId);
      setGraphData(data);
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to load knowledge graph.");
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Load Node Detail when a node is selected
  useEffect(() => {
    if (!datasetId || !selectedNodeId) {
      setNodeDetail(null);
      return;
    }

    async function loadNodeNeighborhood() {
      setDetailLoading(true);
      try {
        const detail = await graphService.getNodeDetail(datasetId, selectedNodeId!);
        setNodeDetail(detail);
      } catch (err: any) {
        console.error("Failed to load node detail:", err);
      } finally {
        setDetailLoading(false);
      }
    }

    loadNodeNeighborhood();
  }, [datasetId, selectedNodeId]);

  // Handle opening entity-specific full modals
  const handleOpenEntityModal = (node: GraphNode) => {
    const normId = node.id.toLowerCase().replace("-", "_");
    if (node.type === "finding" || normId.startsWith("fnd_")) {
      onSelectFindingModal?.(node.id);
    } else if (node.type === "pattern" || normId.startsWith("pat_")) {
      onSelectPatternModal?.(node.id);
    } else if (node.type === "hypothesis" || normId.startsWith("hyp_")) {
      const hyp = (evidenceSummary?.hypotheses || []).find(
        (h) => h.hypothesis_id.toLowerCase().replace("-", "_") === normId
      );
      if (hyp) {
        onSelectHypothesisModal?.(hyp);
      }
    } else if (node.type === "thread" || normId.startsWith("thr_") || normId.startsWith("thread_")) {
      const thr = (evidenceSummary?.threads || []).find(
        (t) => t.thread_id.toLowerCase().replace("-", "_") === normId
      );
      if (thr) {
        onSelectThreadModal?.(thr);
      }
    }
  };

  // Filter and highlight nodes & edges
  const { filteredNodes, filteredEdges, highlightedNodeIds, dimmedNodeIds } = useMemo(() => {
    if (!graphData) {
      return {
        filteredNodes: [],
        filteredEdges: [],
        highlightedNodeIds: new Set<string>(),
        dimmedNodeIds: new Set<string>(),
      };
    }

    const { nodes, edges } = graphData;
    const query = searchQuery.trim().toLowerCase();

    // 1. Thread Subgraph Filter
    let activeThreadId = selectedThreadFilter !== "all" ? selectedThreadFilter : null;
    let relevantNodeIds: Set<string> | null = null;

    if (activeThreadId) {
      relevantNodeIds = new Set<string>();
      nodes.forEach((n) => {
        if (n.thread_ids && n.thread_ids.includes(activeThreadId!)) {
          relevantNodeIds!.add(n.id);
        }
        if (n.id.toLowerCase().replace("-", "_") === activeThreadId!.toLowerCase().replace("-", "_")) {
          relevantNodeIds!.add(n.id);
        }
      });
    }

    // 2. Hypothesis Filter
    if (selectedHypothesisFilter) {
      const hypNormId = selectedHypothesisFilter.toLowerCase().replace("-", "_");
      relevantNodeIds = relevantNodeIds || new Set<string>();
      relevantNodeIds.add(selectedHypothesisFilter);

      // Find connected evidence & findings
      edges.forEach((e) => {
        if (
          e.source.toLowerCase().replace("-", "_") === hypNormId ||
          e.target.toLowerCase().replace("-", "_") === hypNormId
        ) {
          relevantNodeIds!.add(e.source);
          relevantNodeIds!.add(e.target);
        }
      });
    }

    // 3. Filter Nodes by Type and Contradiction
    const filteredN = nodes.filter((n) => {
      if (activeTypeFilter !== "all" && n.type.toLowerCase() !== activeTypeFilter.toLowerCase()) {
        return false;
      }
      if (onlyContradictions && n.polarity !== "contradict") {
        return false;
      }
      if (relevantNodeIds && !relevantNodeIds.has(n.id)) {
        return false;
      }
      return true;
    });

    const visibleNodeIdSet = new Set(filteredN.map((n) => n.id));

    // 4. Filter Edges
    const filteredE = edges.filter((e) => {
      if (!visibleNodeIdSet.has(e.source) || !visibleNodeIdSet.has(e.target)) {
        return false;
      }
      if (onlyContradictions && e.polarity !== "contradict") {
        return false;
      }
      return true;
    });

    // 5. Search highlighting / dimming
    const highlighted = new Set<string>();
    const dimmed = new Set<string>();

    if (query) {
      filteredN.forEach((n) => {
        const matchTitle = (n.title || "").toLowerCase().includes(query);
        const matchLabel = (n.label || "").toLowerCase().includes(query);
        const matchId = (n.id || "").toLowerCase().includes(query);
        const matchDesc = (n.description || "").toLowerCase().includes(query);
        const matchCols = (n.columns || []).some((c) => c.toLowerCase().includes(query));

        if (matchTitle || matchLabel || matchId || matchDesc || matchCols) {
          highlighted.add(n.id);
        } else {
          dimmed.add(n.id);
        }
      });
    }

    return {
      filteredNodes: filteredN,
      filteredEdges: filteredE,
      highlightedNodeIds: highlighted,
      dimmedNodeIds: dimmed,
    };
  }, [
    graphData,
    searchQuery,
    activeTypeFilter,
    selectedThreadFilter,
    selectedHypothesisFilter,
    onlyContradictions,
  ]);

  const handleFitView = () => {
    if (flowInstance) {
      flowInstance.fitView({ padding: 0.15, duration: 400 });
    }
  };

  const handleResetLayout = () => {
    loadGraph();
  };

  if (loading) {
    return (
      <div className="flex h-[720px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-700 border-r-transparent mb-3" />
        <h4 className="text-sm font-bold text-slate-800 font-mono">Synthesizing Interactive Knowledge Graph...</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm font-mono">
          Traversing analytical discoveries, layering cross-tier nodes, and mapping polarity across evidence.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[700px] flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-10 text-center">
        <h4 className="text-base font-bold text-rose-900 font-mono">Failed to Load Knowledge Graph</h4>
        <p className="text-xs text-rose-800 mt-1 max-w-md font-mono">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadGraph}
          className="mt-5 font-mono text-xs"
        >
          <span>Retry Knowledge Graph</span>
        </Button>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex h-[700px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3 shadow-sm">
        <h4 className="text-base font-bold text-slate-800 font-mono uppercase">Knowledge Graph Empty</h4>
        <p className="text-xs text-slate-600 max-w-md font-mono">
          No analytical nodes or investigation threads have been synthesized for this dataset yet. Run Anomaly Detection and Evidence Synthesis to populate the graph.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* 3-Pane Dominant Workspace Container */}
      <div className="flex h-[820px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* LEFT PANE: Threads & Hypotheses Sidebar */}
        <ThreadHypothesisSidebar
          threads={evidenceSummary?.threads || []}
          hypotheses={evidenceSummary?.hypotheses || []}
          selectedThreadId={selectedThreadFilter !== "all" ? selectedThreadFilter : null}
          selectedHypothesisId={selectedHypothesisFilter}
          onSelectThread={(tid) => {
            setSelectedThreadFilter(tid || "all");
            setSelectedHypothesisFilter(null);
          }}
          onSelectHypothesis={(hid) => {
            setSelectedHypothesisFilter(hid);
            setSelectedThreadFilter("all");
          }}
          onOpenThreadModal={onSelectThreadModal}
          onOpenHypothesisModal={onSelectHypothesisModal}
        />

        {/* CENTER PANE: Interactive Canvas + Controls Toolbar */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Top Control Bar */}
          <div className="z-10 p-3 bg-white border-b border-slate-200">
            <GraphControls
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeTypeFilter={activeTypeFilter}
              onTypeFilterChange={setActiveTypeFilter}
              selectedThreadFilter={selectedThreadFilter}
              onThreadFilterChange={setSelectedThreadFilter}
              threads={graphData.thread_ids || []}
              onlyContradictions={onlyContradictions}
              onToggleContradictions={() => setOnlyContradictions((prev) => !prev)}
              nodeTypeCounts={graphData.node_type_counts}
              totalNodes={filteredNodes.length}
              totalEdges={filteredEdges.length}
              onFitView={handleFitView}
              onResetLayout={handleResetLayout}
            />
          </div>

          {/* React Flow Interactive Canvas */}
          <div className="flex-1 w-full h-full relative">
            <InvestigationGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              highlightedNodeIds={highlightedNodeIds}
              dimmedNodeIds={dimmedNodeIds}
              onInitFlow={setFlowInstance}
            />
          </div>
        </div>

        {/* RIGHT PANE: Selected Node Detail & Neighborhood Inspector */}
        <NodeDetailPanel
          nodeDetail={nodeDetail}
          loading={detailLoading}
          onClose={() => setSelectedNodeId(null)}
          onSelectNeighbor={(neighborId) => {
            setSelectedNodeId(neighborId);
            if (flowInstance) {
              const targetNode = filteredNodes.find((n) => n.id === neighborId);
              if (targetNode?.position) {
                flowInstance.setCenter(targetNode.position.x + 100, targetNode.position.y + 40, {
                  zoom: 1.0,
                  duration: 400,
                });
              }
            }
          }}
          onOpenEntityModal={handleOpenEntityModal}
          onInvestigateWithAI={onInvestigateWithAI}
        />
      </div>
    </div>
  );
}
