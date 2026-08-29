import { useMemo } from "react";
import type { IncidentPhase } from "../../lib/types";
import {
  SentinelFlowCanvas,
  buildIncidentFlowGraph,
} from "../flow";

type Props = {
  phase: IncidentPhase;
  dimmed?: boolean;
  onNodeClick?: (phase: IncidentPhase) => void;
};

export function InvestigationGraph({ phase, dimmed, onNodeClick }: Props) {
  const { nodes, edges } = useMemo(() => buildIncidentFlowGraph(), []);

  return (
    <div className="px-4 py-6">
      <SentinelFlowCanvas
        nodes={nodes}
        edges={edges}
        phase={phase}
        dimmed={dimmed}
        draggable
        interactive
        onNodeClick={onNodeClick}
        header={{ left: "INCIDENT GRAPH", right: "LIVE · DATA-DRIVEN" }}
      />
    </div>
  );
}
