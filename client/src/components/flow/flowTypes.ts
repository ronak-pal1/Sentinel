import type { Edge, Node } from "@xyflow/react";
import type { IncidentPhase } from "../../lib/types";

export type NodeKind = "box" | "diamond" | "accent";
export type NodeVisual = "pending" | "active" | "done" | "blocked";

export type SentinelNodeData = {
  label: string;
  kind: NodeKind;
  phase?: IncidentPhase | "escalate";
  visual?: NodeVisual;
  clickable?: boolean;
};

export type SentinelEdgeData = {
  label?: string;
  dashed?: boolean;
};

export type SentinelNode = Node<SentinelNodeData, "sentinel">;
export type SentinelEdge = Edge<SentinelEdgeData, "sentinel">;
