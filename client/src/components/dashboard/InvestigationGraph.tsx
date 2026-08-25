import type { IncidentPhase } from "../../lib/types";

type NodeKind = "box" | "diamond" | "accent";
type NodeVisual = "pending" | "active" | "done" | "blocked";

type GraphNode = {
  id: string;
  phase: IncidentPhase | "escalate";
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: NodeKind;
};

const nodes: GraphNode[] = [
  { id: "alert", phase: "alert", x: 24, y: 48, w: 110, h: 40, label: "ALERT FIRES", kind: "box" },
  { id: "investigate", phase: "investigating", x: 170, y: 48, w: 110, h: 40, label: "INVESTIGATE", kind: "box" },
  { id: "gate1", phase: "root_cause_found", x: 316, y: 40, w: 120, h: 56, label: "ROOT CAUSE\nFOUND?", kind: "diamond" },
  { id: "sandbox", phase: "sandbox_verifying", x: 470, y: 48, w: 110, h: 40, label: "SANDBOX FIX", kind: "box" },
  { id: "escalate", phase: "escalate", x: 316, y: 160, w: 120, h: 40, label: "PAGE HUMAN", kind: "box" },
  { id: "pr", phase: "pr_opened", x: 470, y: 160, w: 110, h: 40, label: "OPEN PR", kind: "box" },
  { id: "approve", phase: "awaiting_approval", x: 620, y: 100, w: 110, h: 40, label: "APPROVE", kind: "accent" },
  { id: "resolved", phase: "resolved", x: 760, y: 100, w: 100, h: 40, label: "RESOLVED", kind: "box" },
];

const phaseRank: Record<string, number> = {
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

function visualFor(
  node: GraphNode,
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
  const mine = phaseRank[node.phase] ?? 0;

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

function Connector({
  from,
  to,
  label,
  dashed,
}: {
  from: [number, number];
  to: [number, number];
  label?: string;
  dashed?: boolean;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const midX = (x1 + x2) / 2;
  return (
    <svg
      className="absolute overflow-visible pointer-events-none"
      style={{ left: 0, top: 0, width: 1, height: 1 }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeDasharray={dashed ? "4 3" : undefined}
        className="text-(--muted-color)"
      />
      {label && (
        <text
          x={midX}
          y={Math.min(y1, y2) - 8}
          className="fill-[#B8791F] text-[10px] font-mono font-semibold"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

type Props = {
  phase: IncidentPhase;
  dimmed?: boolean;
  onNodeClick?: (phase: IncidentPhase) => void;
};

export function InvestigationGraph({ phase, dimmed, onNodeClick }: Props) {
  return (
    <div
      className={`relative px-4 py-6 min-h-72 transition-opacity duration-300 ${dimmed ? "opacity-50" : "opacity-100"}`}
      style={{
        backgroundColor: "var(--canvas-color)",
        backgroundImage:
          "radial-gradient(circle, var(--dot-grid) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
          INCIDENT GRAPH
        </span>
        <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
          LIVE · DATA-DRIVEN
        </span>
      </div>

      <div className="relative h-56 overflow-x-auto">
        <div className="relative min-w-220 h-full">
          <Connector from={[134, 68]} to={[168, 68]} />
          <Connector from={[280, 68]} to={[314, 68]} />
          <Connector from={[400, 64]} to={[466, 68]} label="FOUND" />
          <Connector from={[376, 90]} to={[360, 156]} label="UNKNOWN" dashed />
          <Connector from={[436, 180]} to={[466, 180]} />
          <Connector from={[580, 68]} to={[618, 112]} />
          <Connector from={[580, 180]} to={[618, 128]} />
          <Connector from={[730, 120]} to={[756, 120]} />

          {nodes.map((n) => {
            const vis = visualFor(n, phase);
            const isDiamond = n.kind === "diamond";
            const clickable =
              n.phase !== "escalate" && onNodeClick
                ? () => onNodeClick(n.phase as IncidentPhase)
                : undefined;

            return (
              <button
                key={n.id}
                type="button"
                onClick={clickable}
                disabled={!clickable}
                className={[
                  "absolute flex items-center justify-center text-center px-2 border font-mono text-[10px] tracking-wide leading-tight transition-all",
                  isDiamond ? "rotate-45" : "",
                  vis === "done"
                    ? "bg-[#D6E2DC] border-[#8FBF9F] text-[#3D6B4F]"
                    : vis === "active"
                      ? "bg-(--accent-soft) border-[#EDA53B] text-(--foreground-color) shadow-[0_0_0_3px_rgba(237,165,59,0.25)]"
                      : vis === "blocked"
                        ? "bg-[#EDA53B] border-[#c98a2c] text-(--foreground-color) font-semibold ring-2 ring-[#C9736B]/60"
                        : "bg-(--panel-color) border-(--border-color) text-(--muted-color)",
                  clickable ? "cursor-pointer hover:brightness-95" : "cursor-default",
                ].join(" ")}
                style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
              >
                {vis === "active" && (
                  <span className="absolute inset-0 bg-[#EDA53B]/20 animate-pulse pointer-events-none" />
                )}
                <span
                  className={
                    isDiamond
                      ? "-rotate-45 whitespace-pre-line relative"
                      : "whitespace-pre-line relative"
                  }
                >
                  {vis === "done" && !isDiamond ? `✓ ${n.label}` : n.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
