import type { IncidentPhase } from "../../lib/types";

const pillStyles: Record<string, string> = {
  healthy: "bg-[#D6E2DC] text-[#3D6B4F] border-[#8FBF9F]/60",
  investigating: "bg-[var(--accent-soft)] text-[#B8791F] border-[#EDA53B]/50",
  awaiting_approval: "bg-[var(--accent-soft)] text-[#B8791F] border-[#EDA53B]",
  resolved: "bg-[#D6E2DC] text-[#3D6B4F] border-[#8FBF9F]",
  escalated: "bg-[#E8E4DC] text-[var(--muted-color)] border-[var(--card-border)]",
  rejected: "bg-[#F0D8D5] text-[#8B3F38] border-[#C9736B]/50",
  degraded: "bg-[#F0D8D5] text-[#8B3F38] border-[#C9736B]/40",
};

const labels: Record<string, string> = {
  healthy: "Healthy",
  investigating: "Investigating",
  awaiting_approval: "Awaiting approval",
  resolved: "Resolved",
  escalated: "Escalated",
  rejected: "Rejected",
  degraded: "Degraded",
};

export function StatusPill({
  status,
  phase,
  label: labelOverride,
}: {
  status?: string;
  phase?: IncidentPhase;
  label?: string;
}) {
  const key = status ?? phase ?? "healthy";
  const style = pillStyles[key] ?? pillStyles.healthy;
  const label = labelOverride ?? labels[key] ?? key.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 border ${style}`}
    >
      <span
        className={`w-1.5 h-1.5 inline-block ${
          key === "investigating" || key === "awaiting_approval"
            ? "bg-[#EDA53B] animate-pulse"
            : key === "resolved" || key === "healthy"
              ? "bg-[#3D6B4F]"
              : key === "rejected" || key === "degraded"
                ? "bg-[#C9736B]"
                : "bg-stone-500"
        }`}
      />
      {label}
    </span>
  );
}
