import React, { useCallback, useMemo, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { CustomGraphNode } from "./CustomGraphNodes";
import { GraphNode, GraphEdge } from "@/types/graph";

interface InvestigationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  highlightedNodeIds?: Set<string>;
  dimmedNodeIds?: Set<string>;
  onInitFlow?: (instance: ReactFlowInstance) => void;
}

const nodeTypes = {
  custom: CustomGraphNode,
};

export function InvestigationGraph({
  nodes: rawNodes,
  edges: rawEdges,
  selectedNodeId,
  onSelectNode,
  highlightedNodeIds,
  dimmedNodeIds,
  onInitFlow,
}: InvestigationGraphProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Convert raw graph nodes into ReactFlow Node format
  const initialNodes: Node[] = useMemo(() => {
    return rawNodes.map((n) => {
      const isSelected = selectedNodeId === n.id;
      const isHighlighted = highlightedNodeIds ? highlightedNodeIds.has(n.id) : false;
      const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(n.id) : false;

      return {
        id: n.id,
        type: "custom",
        position: n.position || { x: (n.tier ?? 0) * 320 + 80, y: 100 },
        data: {
          ...n,
          isHighlighted,
          isDimmed,
        },
        selected: isSelected,
      };
    });
  }, [rawNodes, selectedNodeId, highlightedNodeIds, dimmedNodeIds]);

  // Convert raw graph edges into ReactFlow Edge format
  const initialEdges: Edge[] = useMemo(() => {
    return rawEdges.map((e) => {
      const isContradiction = e.polarity === "contradict";
      const isSupport = e.polarity === "support";
      const isConnectedToSelected =
        selectedNodeId ? e.source === selectedNodeId || e.target === selectedNodeId : false;

      let strokeColor = "#94a3b8"; // slate-400
      if (isContradiction) {
        strokeColor = "#e11d48"; // rose-600
      } else if (isSupport) {
        strokeColor = "#059669"; // emerald-600
      } else if (isConnectedToSelected) {
        strokeColor = "#0f766e"; // teal-700
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: "smoothstep",
        animated: isContradiction || isConnectedToSelected,
        style: {
          stroke: strokeColor,
          strokeWidth: isConnectedToSelected ? 2 : isContradiction ? 2 : 1.5,
          strokeDasharray: isContradiction ? "6 4" : undefined,
          opacity: dimmedNodeIds && (dimmedNodeIds.has(e.source) || dimmedNodeIds.has(e.target)) ? 0.2 : 0.9,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 12,
          height: 12,
        },
        labelStyle: {
          fill: isContradiction ? "#9f1239" : "#334155",
          fontSize: 9,
          fontWeight: 600,
          fontFamily: "monospace",
        },
        labelBgStyle: {
          fill: "#ffffff",
          fillOpacity: 0.95,
          stroke: "#cbd5e1",
          strokeWidth: 1,
          rx: 3,
          ry: 3,
        },
        labelBgPadding: [4, 2] as [number, number],
      };
    });
  }, [rawEdges, selectedNodeId, dimmedNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      flowInstanceRef.current = instance;
      if (onInitFlow) onInitFlow(instance);
      setTimeout(() => {
        instance.fitView({ padding: 0.15, duration: 300 });
      }, 100);
    },
    [onInitFlow]
  );

  const getMiniMapNodeColor = (node: Node) => {
    const type = node.data?.type?.toLowerCase();
    switch (type) {
      case "finding":
        return "#d97706";
      case "pattern":
        return "#7c3aed";
      case "evidence":
        return node.data?.polarity === "contradict" ? "#e11d48" : "#059669";
      case "hypothesis":
        return "#2563eb";
      case "thread":
        return "#0e7490";
      case "event":
        return "#ea580c";
      default:
        return "#94a3b8";
    }
  };

  return (
    <div className="relative h-full w-full bg-[#f8fafc]" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onInit={handleInit}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.15}
        maxZoom={2.0}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#cbd5e1"
          className="opacity-60"
        />
        <Controls
          className="!bg-white !border-slate-200 !rounded-md !shadow-sm fill-slate-700"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={getMiniMapNodeColor}
          nodeStrokeWidth={2}
          zoomable
          pannable
          className="!bg-white !border !border-slate-200 !rounded-md overflow-hidden !shadow-sm"
          maskColor="rgba(241, 245, 249, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
