import type { CSSProperties } from "react";
import type { IncidentPhase } from "../lib/types";
import {
  buildApprovalCapabilityGraph,
  buildPrReviewCapabilityGraph,
  buildSandboxCapabilityGraph,
  buildSection2FlowGraph,
} from "../components/flow";

export type CapabilityId = "incident" | "sandbox" | "pr" | "approval";

export type LogLine = {
  t: string;
  text: string;
  c: string;
};

export type StickyNote = {
  text: string;
  className: string;
  style?: CSSProperties;
};

export type CapabilityConfig = {
  id: CapabilityId;
  title: string;
  sub: string;
  gateIndex: number;
  graphBuilder: () => ReturnType<typeof buildSection2FlowGraph>;
  header: { left: string; right: string };
  notes: StickyNote[];
  agentPrompt: string;
  agentStatus: string;
  tags: string[];
  footerFig: string;
  footerRight: string;
  staticLogLines: LogLine[];
  highlightPhase?: IncidentPhase;
};

export const CAPABILITY_ORDER: CapabilityId[] = [
  "incident",
  "sandbox",
  "pr",
  "approval",
];

export const capabilityConfigs: Record<CapabilityId, CapabilityConfig> = {
  incident: {
    id: "incident",
    title: "Incident Flow",
    sub: "READ-ONLY · LIVE",
    gateIndex: 1,
    graphBuilder: buildSection2FlowGraph,
    header: {
      left: "INCIDENT GRAPH",
      right: "CHECKOUT-SVC · P99 4.2S → 380MS",
    },
    notes: [
      {
        text: "Read-only first. The agent never touches state until a human clicks approve.",
        className:
          "absolute left-8 bottom-6 w-56 border border-(--card-border) shadow-sm px-4 py-3 -rotate-2",
        style: { backgroundColor: "var(--note-warm)" },
      },
      {
        text: "No root cause found? Escalate — don't guess.",
        className:
          "absolute left-105 bottom-2 w-48 border border-(--card-border) shadow-sm px-4 py-3 rotate-1",
        style: { backgroundColor: "var(--note-cool)" },
      },
    ],
    agentPrompt: "approve rollback of deploy 8f1c?",
    agentStatus:
      "Investigating — gathering evidence before any write.",
    tags: ["TrueForge", "Qodo", "GitHub MCP"],
    footerFig: "FIG. 01 — READ, VERIFY, GATE, SHIP",
    footerRight: "BUILT ON TRUEFORGE",
    staticLogLines: [],
  },
  sandbox: {
    id: "sandbox",
    title: "Sandbox Verify",
    sub: "ISOLATED · DAILY",
    gateIndex: 2,
    graphBuilder: buildSandboxCapabilityGraph,
    header: {
      left: "SANDBOX GRAPH",
      right: "380MS · 0 ERRORS · 500 REPLAYED",
    },
    notes: [
      {
        text: "Isolated clone — zero production writes during verification.",
        className:
          "absolute left-8 bottom-6 w-56 border border-(--card-border) shadow-sm px-4 py-3 -rotate-2",
        style: { backgroundColor: "var(--note-warm)" },
      },
      {
        text: "500 requests replayed before any merge is proposed.",
        className:
          "absolute left-105 bottom-2 w-52 border border-(--card-border) shadow-sm px-4 py-3 rotate-1",
        style: { backgroundColor: "var(--note-cool)" },
      },
    ],
    agentPrompt: "replay traffic against patched write_timeout: 200ms?",
    agentStatus:
      "Sandbox confirms fix — latency 380ms, 0 errors in 500 requests.",
    tags: ["TrueForge", "Sandbox MCP"],
    footerFig: "FIG. 02 — CLONE, REPLAY, VERIFY",
    footerRight: "ISOLATED · EPHEMERAL CLONE",
    highlightPhase: "sandbox_verifying",
    staticLogLines: [
      {
        t: "›",
        text: "sandbox: replay traffic against patched config",
        c: "text-[#EDA53B]",
      },
      {
        t: "·",
        text: "cloning checkout-svc into ephemeral environment",
        c: "text-stone-500",
      },
      {
        t: "·",
        text: "  ↳ write_timeout patched 50ms → 200ms",
        c: "text-stone-500",
      },
      {
        t: "·",
        text: "replaying 500 production requests (p50=210ms p95=340ms)",
        c: "text-stone-500",
      },
      {
        t: "✓",
        text: "sandbox confirms fix — latency 380ms, 0 errors in 500 requests",
        c: "text-[#8FBF9F]",
      },
    ],
  },
  pr: {
    id: "pr",
    title: "PR + Review",
    sub: "QODO · EVERY FIX",
    gateIndex: 3,
    graphBuilder: buildPrReviewCapabilityGraph,
    header: {
      left: "PR GRAPH",
      right: "#42 · CONFIG.YAML · QODO",
    },
    notes: [
      {
        text: "Every fix ships as a PR — never a direct push to main.",
        className:
          "absolute left-8 bottom-6 w-56 border border-(--card-border) shadow-sm px-4 py-3 -rotate-2",
        style: { backgroundColor: "var(--note-warm)" },
      },
      {
        text: "Qodo reviews the diff before a human ever sees it.",
        className:
          "absolute left-105 bottom-2 w-48 border border-(--card-border) shadow-sm px-4 py-3 rotate-1",
        style: { backgroundColor: "var(--note-cool)" },
      },
    ],
    agentPrompt: "open PR #42 — restore write_timeout to 200ms?",
    agentStatus:
      "Qodo flagged line 15 — restoring 200ms matches prior stable baseline.",
    tags: ["Qodo", "GitHub MCP"],
    footerFig: "FIG. 03 — OPEN, SCAN, REVIEW",
    footerRight: "QODO · EVERY FIX",
    highlightPhase: "pr_opened",
    staticLogLines: [
      {
        t: "›",
        text: "github: open PR #42",
        c: "text-[#EDA53B]",
      },
      {
        t: "·",
        text: "  ↳ checkout-svc/config.yaml — write_timeout 50ms → 200ms",
        c: "text-stone-500",
      },
      {
        t: "·",
        text: "qodo: scanning diff for regressions",
        c: "text-stone-500",
      },
      {
        t: "✓",
        text: "qodo: review comments received on config.yaml:15",
        c: "text-[#8FBF9F]",
      },
      {
        t: "·",
        text: '  ↳ "Restoring 200ms matches prior stable baseline. LGTM."',
        c: "text-stone-500",
      },
    ],
  },
  approval: {
    id: "approval",
    title: "Approval Gate",
    sub: "HUMAN · ALWAYS ON",
    gateIndex: 4,
    graphBuilder: buildApprovalCapabilityGraph,
    header: {
      left: "APPROVAL GATE",
      right: "HUMAN · REQUIRED",
    },
    notes: [
      {
        text: "Nothing irreversible ships without a person reading the diff.",
        className:
          "absolute left-8 bottom-6 w-56 border border-(--card-border) shadow-sm px-4 py-3 -rotate-2",
        style: { backgroundColor: "var(--note-warm)" },
      },
      {
        text: "One click to approve. One click to reject. Always logged.",
        className:
          "absolute left-105 bottom-2 w-52 border border-(--card-border) shadow-sm px-4 py-3 rotate-1",
        style: { backgroundColor: "var(--note-cool)" },
      },
    ],
    agentPrompt: "approve rollback of deploy 8f1c?",
    agentStatus:
      "Waiting on you — this action is irreversible once merged.",
    tags: ["GitHub MCP"],
    footerFig: "FIG. 04 — REVIEW, APPROVE, SHIP",
    footerRight: "HUMAN · ALWAYS ON",
    highlightPhase: "awaiting_approval",
    staticLogLines: [
      {
        t: "·",
        text: "proposed action: merge PR #42 and redeploy checkout-svc",
        c: "text-stone-500",
      },
      {
        t: "›",
        text: "awaiting human approval — diff ready for review",
        c: "text-[#EDA53B]",
      },
      {
        t: "·",
        text: "  ↳ write_timeout 50ms → 200ms in deploy 8f1c",
        c: "text-stone-500",
      },
      {
        t: "✓",
        text: "human approved — rollback of 8f1c merged",
        c: "text-[#8FBF9F]",
      },
      {
        t: "✓",
        text: "checkout-svc resolved — p99 latency back to 380ms",
        c: "text-[#8FBF9F]",
      },
    ],
  },
};

export const capabilitiesList = CAPABILITY_ORDER.map(
  (id) => capabilityConfigs[id],
);
