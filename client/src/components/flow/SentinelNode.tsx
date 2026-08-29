import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SentinelNodeData } from "./flowTypes";

export function SentinelNodeComponent({ data }: NodeProps) {
  const nodeData = data as SentinelNodeData;
  const { label, kind, visual = "pending", clickable = false } = nodeData;
  const isDiamond = kind === "diamond";
  const isAccent = kind === "accent";

  const stateClasses =
    visual === "done"
      ? "bg-[#D6E2DC] border-[#8FBF9F] text-[#3D6B4F]"
      : visual === "active"
        ? "bg-(--accent-soft) border-[#EDA53B] text-(--foreground-color) shadow-[0_0_0_3px_rgba(237,165,59,0.25)]"
        : visual === "blocked"
          ? "bg-[#EDA53B] border-[#c98a2c] text-(--foreground-color) font-semibold ring-2 ring-[#C9736B]/60"
          : isAccent
            ? "bg-primary border-[#c98a2c] text-[#1a1a1a] font-semibold"
            : "bg-(--panel-color) border-(--border-color) text-(--muted-color)";

  const displayLabel =
    visual === "done" && !isDiamond ? `✓ ${label}` : label;

  return (
    <div className="relative h-full w-full">
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />

      <div
        className={[
          "flex h-full w-full items-center justify-center border px-2 text-center font-mono text-[10px] leading-tight tracking-wide transition-all",
          isDiamond ? "rotate-45" : "",
          stateClasses,
          clickable ? "cursor-pointer hover:brightness-95" : "cursor-default",
        ].join(" ")}
      >
        {visual === "active" && (
          <span className="pointer-events-none absolute inset-0 animate-pulse bg-[#EDA53B]/20" />
        )}
        <span
          className={
            isDiamond
              ? "relative -rotate-45 whitespace-pre-line"
              : "relative whitespace-pre-line"
          }
        >
          {displayLabel}
        </span>
      </div>
    </div>
  );
}
