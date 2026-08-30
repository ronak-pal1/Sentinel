import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import type { IncidentPhase } from "../../lib/types";
import { applyVisuals } from "./flowUtils";
import type { SentinelNodeData } from "./flowTypes";
import {
  sentinelDefaultEdgeOptions,
  sentinelEdgeTypes,
} from "./sentinelEdgeTypes";
import { sentinelNodeTypes } from "./sentinelNodeTypes";

type HeaderConfig = {
  left: string;
  right: string;
};

type SentinelFlowCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  phase?: IncidentPhase;
  draggable?: boolean;
  interactive?: boolean;
  dimmed?: boolean;
  header?: HeaderConfig;
  minHeight?: string;
  onNodeClick?: (phase: IncidentPhase) => void;
};

const MIN_FIT_HEIGHT = 40;

function FlowInner({
  nodes: inputNodes,
  edges: inputEdges,
  phase,
  draggable = true,
  interactive = false,
  dimmed,
  header,
  minHeight = "18rem",
  onNodeClick,
}: SentinelFlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const { fitView } = useReactFlow();

  const preparedNodes = useMemo(() => {
    const withClick = inputNodes.map((node: Node) => {
      const data = node.data as SentinelNodeData;
      const clickable =
        interactive &&
        !!onNodeClick &&
        !!data.phase &&
        data.phase !== "escalate";

      return {
        ...node,
        draggable,
        data: {
          ...data,
          clickable,
        },
      };
    });

    return phase ? applyVisuals(withClick, phase) : withClick;
  }, [inputNodes, phase, interactive, onNodeClick, draggable]);

  const [nodes, setNodes, onNodesChange] = useNodesState(preparedNodes);
  const [edges, , onEdgesChange] = useEdgesState(inputEdges);

  useEffect(() => {
    setNodes(preparedNodes);
  }, [preparedNodes, setNodes]);

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight < MIN_FIT_HEIGHT) return;
    fitView({ padding: 0.12, maxZoom: 1 });
  }, [fitView]);

  // Fit once on mount only — do not re-fit on every phase change (that blanks the viewport).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fitToView();
    }, 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only fit
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = window.setTimeout(() => {
        fitToView();
      }, 80);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
    };
  }, [fitToView]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as SentinelNodeData;
      if (
        interactive &&
        onNodeClick &&
        data.phase &&
        data.phase !== "escalate"
      ) {
        onNodeClick(data.phase as IncidentPhase);
      }
    },
    [interactive, onNodeClick],
  );

  return (
    <div
      className={`sentinel-flow transition-opacity duration-300 ${dimmed ? "opacity-80" : "opacity-100"}`}
      style={{
        backgroundColor: "var(--canvas-color)",
        backgroundImage:
          "radial-gradient(circle, var(--dot-grid) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      {header && (
        <div className="mb-4 flex items-center justify-between px-2">
          <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            {header.left}
          </span>
          <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            {header.right}
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full"
        style={{ height: minHeight, minHeight }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={sentinelNodeTypes}
          edgeTypes={sentinelEdgeTypes}
          defaultEdgeOptions={sentinelDefaultEdgeOptions}
          nodesDraggable={draggable}
          nodesConnectable={false}
          elementsSelectable={interactive}
          panOnDrag={false}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          minZoom={0.2}
          maxZoom={1}
          style={{ width: "100%", height: "100%" }}
          proOptions={{ hideAttribution: true }}
        />
      </div>
    </div>
  );
}

export function SentinelFlowCanvas(props: SentinelFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
