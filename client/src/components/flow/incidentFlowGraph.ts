import type { SentinelEdge, SentinelNode } from "./flowTypes";

type GraphDefinition = {
  nodes: SentinelNode[];
  edges: SentinelEdge[];
};

const incidentNodes: Omit<SentinelNode, "type">[] = [
  {
    id: "alert",
    position: { x: 24, y: 48 },
    data: { label: "ALERT FIRES", kind: "box", phase: "alert" },
    style: { width: 110, height: 40 },
  },
  {
    id: "investigate",
    position: { x: 170, y: 48 },
    data: { label: "INVESTIGATE", kind: "box", phase: "investigating" },
    style: { width: 110, height: 40 },
  },
  {
    id: "gate1",
    position: { x: 316, y: 40 },
    data: { label: "ROOT CAUSE\nFOUND?", kind: "diamond", phase: "root_cause_found" },
    style: { width: 120, height: 56 },
  },
  {
    id: "sandbox",
    position: { x: 470, y: 48 },
    data: { label: "SANDBOX FIX", kind: "box", phase: "sandbox_verifying" },
    style: { width: 110, height: 40 },
  },
  {
    id: "escalate",
    position: { x: 316, y: 160 },
    data: { label: "PAGE HUMAN", kind: "box", phase: "escalate" },
    style: { width: 120, height: 40 },
  },
  {
    id: "pr",
    position: { x: 470, y: 160 },
    data: { label: "OPEN PR", kind: "box", phase: "pr_opened" },
    style: { width: 110, height: 40 },
  },
  {
    id: "approve",
    position: { x: 620, y: 100 },
    data: { label: "APPROVE", kind: "accent", phase: "awaiting_approval" },
    style: { width: 110, height: 40 },
  },
  {
    id: "resolved",
    position: { x: 760, y: 100 },
    data: { label: "RESOLVED", kind: "box", phase: "resolved" },
    style: { width: 100, height: 40 },
  },
];

const incidentEdges: Omit<SentinelEdge, "type">[] = [
  { id: "e-alert-investigate", source: "alert", target: "investigate" },
  { id: "e-investigate-gate1", source: "investigate", target: "gate1" },
  {
    id: "e-gate1-sandbox",
    source: "gate1",
    target: "sandbox",
    sourceHandle: "right",
    data: { label: "FOUND" },
  },
  {
    id: "e-gate1-escalate",
    source: "gate1",
    target: "escalate",
    sourceHandle: "bottom",
    data: { label: "UNKNOWN", dashed: true },
  },
  { id: "e-escalate-pr", source: "escalate", target: "pr" },
  {
    id: "e-sandbox-approve",
    source: "sandbox",
    target: "approve",
    targetHandle: "top",
  },
  {
    id: "e-pr-approve",
    source: "pr",
    target: "approve",
    targetHandle: "bottom",
  },
  { id: "e-approve-resolved", source: "approve", target: "resolved" },
];

const section2Nodes: Omit<SentinelNode, "type">[] = [
  {
    id: "alert",
    position: { x: 40, y: 60 },
    data: { label: "ALERT FIRES", kind: "box" },
    style: { width: 120, height: 44 },
  },
  {
    id: "investigate",
    position: { x: 200, y: 60 },
    data: { label: "INVESTIGATE", kind: "box" },
    style: { width: 120, height: 44 },
  },
  {
    id: "gate1",
    position: { x: 360, y: 52 },
    data: { label: "ROOT CAUSE\nFOUND?", kind: "diamond" },
    style: { width: 130, height: 60 },
  },
  {
    id: "sandbox",
    position: { x: 530, y: 60 },
    data: { label: "SANDBOX FIX", kind: "box" },
    style: { width: 120, height: 44 },
  },
  {
    id: "escalate",
    position: { x: 360, y: 190 },
    data: { label: "PAGE HUMAN", kind: "box" },
    style: { width: 130, height: 44 },
  },
  {
    id: "pr",
    position: { x: 530, y: 190 },
    data: { label: "OPEN PR", kind: "box" },
    style: { width: 120, height: 44 },
  },
  {
    id: "approve",
    position: { x: 700, y: 125 },
    data: { label: "APPROVE", kind: "accent" },
    style: { width: 120, height: 44 },
  },
];

const section2Edges: Omit<SentinelEdge, "type">[] = [
  { id: "e-alert-investigate", source: "alert", target: "investigate" },
  { id: "e-investigate-gate1", source: "investigate", target: "gate1" },
  {
    id: "e-gate1-sandbox",
    source: "gate1",
    target: "sandbox",
    sourceHandle: "right",
    data: { label: "FOUND" },
  },
  {
    id: "e-gate1-escalate",
    source: "gate1",
    target: "escalate",
    sourceHandle: "bottom",
    data: { label: "UNKNOWN" },
  },
  { id: "e-escalate-pr", source: "escalate", target: "pr" },
  {
    id: "e-sandbox-approve",
    source: "sandbox",
    target: "approve",
    targetHandle: "top",
  },
  {
    id: "e-pr-approve",
    source: "pr",
    target: "approve",
    targetHandle: "bottom",
  },
];

function toGraph(
  nodes: Omit<SentinelNode, "type">[],
  edges: Omit<SentinelEdge, "type">[],
): GraphDefinition {
  return {
    nodes: nodes.map((node) => ({ ...node, type: "sentinel" as const })),
    edges: edges.map((edge) => ({ ...edge, type: "sentinel" as const })),
  };
}

export function buildIncidentFlowGraph(): GraphDefinition {
  return toGraph(incidentNodes, incidentEdges);
}

export function buildSection2FlowGraph(): GraphDefinition {
  return toGraph(section2Nodes, section2Edges);
}

const sandboxCapabilityNodes: Omit<SentinelNode, "type">[] = [
  {
    id: "patch",
    position: { x: 40, y: 70 },
    data: { label: "PATCH CONFIG", kind: "box", phase: "root_cause_found" },
    style: { width: 130, height: 44 },
  },
  {
    id: "clone",
    position: { x: 200, y: 70 },
    data: { label: "CLONE ENV", kind: "box", phase: "sandbox_verifying" },
    style: { width: 120, height: 44 },
  },
  {
    id: "replay",
    position: { x: 350, y: 70 },
    data: { label: "REPLAY TRAFFIC", kind: "box", phase: "sandbox_verifying" },
    style: { width: 140, height: 44 },
  },
  {
    id: "metrics",
    position: { x: 520, y: 62 },
    data: { label: "METRICS OK?", kind: "diamond", phase: "sandbox_verifying" },
    style: { width: 130, height: 60 },
  },
  {
    id: "ready",
    position: { x: 690, y: 70 },
    data: { label: "READY FOR PR", kind: "box", phase: "resolved" },
    style: { width: 130, height: 44 },
  },
];

const sandboxCapabilityEdges: Omit<SentinelEdge, "type">[] = [
  { id: "e-patch-clone", source: "patch", target: "clone" },
  { id: "e-clone-replay", source: "clone", target: "replay" },
  { id: "e-replay-metrics", source: "replay", target: "metrics" },
  {
    id: "e-metrics-ready",
    source: "metrics",
    target: "ready",
    sourceHandle: "right",
    data: { label: "PASS" },
  },
];

const prReviewCapabilityNodes: Omit<SentinelNode, "type">[] = [
  {
    id: "open-pr",
    position: { x: 40, y: 70 },
    data: { label: "OPEN PR", kind: "box", phase: "pr_opened" },
    style: { width: 120, height: 44 },
  },
  {
    id: "qodo-scan",
    position: { x: 190, y: 70 },
    data: { label: "QODO SCAN", kind: "box", phase: "pr_opened" },
    style: { width: 120, height: 44 },
  },
  {
    id: "comments",
    position: { x: 340, y: 70 },
    data: { label: "REVIEW COMMENTS", kind: "box", phase: "pr_opened" },
    style: { width: 150, height: 44 },
  },
  {
    id: "lgtm",
    position: { x: 520, y: 70 },
    data: { label: "LGTM", kind: "accent", phase: "awaiting_approval" },
    style: { width: 110, height: 44 },
  },
];

const prReviewCapabilityEdges: Omit<SentinelEdge, "type">[] = [
  { id: "e-open-qodo", source: "open-pr", target: "qodo-scan" },
  { id: "e-qodo-comments", source: "qodo-scan", target: "comments" },
  { id: "e-comments-lgtm", source: "comments", target: "lgtm" },
];

const approvalCapabilityNodes: Omit<SentinelNode, "type">[] = [
  {
    id: "proposed",
    position: { x: 40, y: 70 },
    data: { label: "PROPOSED FIX", kind: "box", phase: "pr_opened" },
    style: { width: 130, height: 44 },
  },
  {
    id: "review-diff",
    position: { x: 200, y: 70 },
    data: { label: "REVIEW DIFF", kind: "box", phase: "awaiting_approval" },
    style: { width: 130, height: 44 },
  },
  {
    id: "approve-gate",
    position: { x: 370, y: 62 },
    data: { label: "APPROVE?", kind: "diamond", phase: "awaiting_approval" },
    style: { width: 120, height: 60 },
  },
  {
    id: "merge",
    position: { x: 530, y: 70 },
    data: { label: "MERGE", kind: "box", phase: "resolved" },
    style: { width: 110, height: 44 },
  },
  {
    id: "resolved-gate",
    position: { x: 680, y: 70 },
    data: { label: "RESOLVED", kind: "accent", phase: "resolved" },
    style: { width: 120, height: 44 },
  },
];

const approvalCapabilityEdges: Omit<SentinelEdge, "type">[] = [
  { id: "e-proposed-review", source: "proposed", target: "review-diff" },
  { id: "e-review-approve", source: "review-diff", target: "approve-gate" },
  {
    id: "e-approve-merge",
    source: "approve-gate",
    target: "merge",
    sourceHandle: "right",
    data: { label: "YES" },
  },
  { id: "e-merge-resolved", source: "merge", target: "resolved-gate" },
];

export function buildSandboxCapabilityGraph(): GraphDefinition {
  return toGraph(sandboxCapabilityNodes, sandboxCapabilityEdges);
}

export function buildPrReviewCapabilityGraph(): GraphDefinition {
  return toGraph(prReviewCapabilityNodes, prReviewCapabilityEdges);
}

export function buildApprovalCapabilityGraph(): GraphDefinition {
  return toGraph(approvalCapabilityNodes, approvalCapabilityEdges);
}
