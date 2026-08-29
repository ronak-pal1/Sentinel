import { memo } from "react";
import { MarkerType } from "@xyflow/react";
import { SentinelEdgeComponent } from "./SentinelEdge";

export const sentinelEdgeTypes = {
  sentinel: memo(SentinelEdgeComponent),
};

export const sentinelDefaultEdgeOptions = {
  type: "sentinel" as const,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 12,
    height: 12,
    color: "var(--muted-color)",
  },
};
