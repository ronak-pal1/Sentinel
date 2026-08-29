import type { IncidentPhase } from "../../lib/types";
import type { NodeVisual, SentinelNodeData } from "./flowTypes";

export const phaseRank: Record<string, number> = {
  alert: 0,
  investigating: 1,
  root_cause_found: 2,
  sandbox_verifying: 3,
  pr_opened: 4,
  awaiting_approval: 5,
  resolved: 6,
  rejected: 5,
  escalated: 2,
};

export function visualFor(
  node: { phase?: IncidentPhase | "escalate" },
  phase: IncidentPhase,
): NodeVisual {
  if (phase === "escalated") {
    if (node.phase === "escalate") return "done";
    if (
      node.phase === "alert" ||
      node.phase === "investigating" ||
      node.phase === "root_cause_found"
    )
      return "done";
    return "pending";
  }

  if (node.phase === "escalate") return "pending";

  const cur = phaseRank[phase] ?? 0;
  const mine = phaseRank[node.phase ?? ""] ?? 0;

  if (phase === "rejected" && node.phase === "awaiting_approval") {
    return "blocked";
  }
  if (mine < cur) return "done";
  if (mine === cur) {
    return phase === "awaiting_approval" && node.phase === "awaiting_approval"
      ? "blocked"
      : "active";
  }
  return "pending";
}

export function applyVisuals<T extends { id: string; data: SentinelNodeData }>(
  nodes: T[],
  phase?: IncidentPhase,
): T[] {
  if (!phase) return nodes;
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      visual: visualFor(node.data, phase),
    },
  }));
}
