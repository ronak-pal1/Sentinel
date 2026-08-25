import { FiCheck } from "react-icons/fi";
import type { IncidentPhase } from "../../lib/types";
import { PHASE_LABELS, PHASE_ORDER } from "../../lib/types";

type StepState = "upcoming" | "in-progress" | "done" | "blocked" | "branch";

function stepState(step: IncidentPhase, current: IncidentPhase): StepState {
  if (current === "escalated") {
    const escalateCutoff = PHASE_ORDER.indexOf("root_cause_found");
    const idx = PHASE_ORDER.indexOf(step);
    if (idx < escalateCutoff) return "done";
    if (step === "root_cause_found") return "branch";
    return "upcoming";
  }
  if (current === "rejected") {
    const approveIdx = PHASE_ORDER.indexOf("awaiting_approval");
    const idx = PHASE_ORDER.indexOf(step);
    if (idx < approveIdx) return "done";
    if (step === "awaiting_approval") return "blocked";
    return "upcoming";
  }

  const curIdx = PHASE_ORDER.indexOf(current);
  const idx = PHASE_ORDER.indexOf(step);
  if (curIdx < 0) return "upcoming";
  if (idx < curIdx) return "done";
  if (idx === curIdx) {
    return current === "awaiting_approval" ? "blocked" : "in-progress";
  }
  return "upcoming";
}

type Props = {
  phase: IncidentPhase;
  compact?: boolean;
};

export function PhaseStepper({ phase, compact = false }: Props) {
  const showEscalate = phase === "escalated";

  return (
    <div className="w-full">
      <div
        className={`flex ${compact ? "flex-wrap gap-2" : "flex-col sm:flex-row sm:items-center gap-2 sm:gap-0"}`}
      >
        {PHASE_ORDER.map((step, i) => {
          const state = stepState(step, phase);
          return (
            <div key={step} className="flex items-center sm:flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <StepDot state={state} />
                <span
                  className={[
                    "font-mono tracking-wide truncate",
                    compact ? "text-[9px]" : "text-[10px]",
                    state === "done"
                      ? "text-[#3D6B4F]"
                      : state === "in-progress"
                        ? "text-[#B8791F] font-semibold"
                        : state === "blocked"
                          ? "text-[#C9736B] font-semibold"
                          : "text-(--muted-color)",
                  ].join(" ")}
                >
                  {PHASE_LABELS[step]}
                </span>
              </div>
              {i < PHASE_ORDER.length - 1 && (
                <div
                  className={`hidden sm:block flex-1 h-px mx-2 ${
                    state === "done" ? "bg-[#8FBF9F]" : "bg-(--border-color)"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {showEscalate && (
        <div className="mt-3 flex items-center gap-2 pl-1">
          <div className="w-px h-6 border-l border-dashed border-(--card-border) ml-2" />
          <div className="flex items-center gap-2">
            <StepDot state="branch" />
            <span className="text-[10px] font-mono tracking-wide text-(--muted-color) font-semibold">
              Paged Human
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDot({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="w-5 h-5 shrink-0 flex items-center justify-center bg-[#8FBF9F] text-(--foreground-color)">
        <FiCheck className="w-3 h-3" />
      </span>
    );
  }
  if (state === "in-progress") {
    return (
      <span className="w-5 h-5 shrink-0 border-2 border-[#EDA53B] bg-(--accent-soft) relative">
        <span className="absolute inset-0 bg-[#EDA53B]/30 animate-ping" />
      </span>
    );
  }
  if (state === "blocked") {
    return (
      <span className="w-5 h-5 shrink-0 border-2 border-[#C9736B] bg-[#F0D8D5] ring-2 ring-[#EDA53B]/40" />
    );
  }
  if (state === "branch") {
    return (
      <span className="w-5 h-5 shrink-0 border border-dashed border-(--muted-color) bg-(--surface-color)" />
    );
  }
  return (
    <span className="w-5 h-5 shrink-0 border border-(--border-color) bg-transparent" />
  );
}
