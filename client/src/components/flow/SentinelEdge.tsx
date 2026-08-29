import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { SentinelEdgeData } from "./flowTypes";

export function SentinelEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as SentinelEdgeData | undefined;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 1.5,
          strokeDasharray: edgeData?.dashed ? "4 3" : undefined,
        }}
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute text-[10px] font-mono font-semibold text-[#B8791F]"
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 8}px)`,
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
