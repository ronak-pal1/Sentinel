import type { ProfileMode } from "../lib/profile";

export type ModeCardConfig = {
  id: ProfileMode;
  title: string;
  description: string;
  features: string[];
};

export const MODE_OPTIONS: ModeCardConfig[] = [
  {
    id: "demo",
    title: "Demo mode",
    description:
      "Try Sentinel instantly — no API keys, scripted incident flow with sandbox verify and PR approval.",
    features: [
      "Break It synthetic failure",
      "Full agent flow in ~16 seconds",
      "No GitHub or webhook setup",
    ],
  },
  {
    id: "real",
    title: "Real mode",
    description:
      "Connect GitHub, create webhooks, and run TrueForge + Daytona for live incident response.",
    features: [
      "GitHub PAT connection",
      "Webhook URL for alert systems",
      "TrueForge agent with Daytona sandbox (configured in TrueForge)",
      "PR created only after your approval",
    ],
  },
];

type ModeCardsProps = {
  currentMode?: ProfileMode | null;
  onSelect: (mode: ProfileMode) => void;
  submitting?: ProfileMode | null;
  disabled?: boolean;
};

export function ModeCards({
  currentMode = null,
  onSelect,
  submitting = null,
  disabled = false,
}: ModeCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {MODE_OPTIONS.map((mode) => {
        const isActive = currentMode === mode.id;
        const isSubmitting = submitting === mode.id;
        const isDisabled = disabled || submitting !== null || isActive;

        return (
          <button
            key={mode.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(mode.id)}
            className={[
              "text-left border bg-(--panel-color) p-6 transition-colors disabled:opacity-60",
              isActive
                ? "border-primary ring-1 ring-primary"
                : "border-(--border-color) hover:border-primary",
            ].join(" ")}
          >
            <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
              {mode.id.toUpperCase()}
              {isActive ? " · CURRENT" : ""}
            </p>
            <h2 className="text-lg font-semibold mb-2">{mode.title}</h2>
            <p className="text-sm text-(--muted-color) mb-4">
              {mode.description}
            </p>
            <ul className="space-y-1.5">
              {mode.features.map((f) => (
                <li
                  key={f}
                  className="text-[12px] text-(--muted-color) before:content-['·'] before:mr-2"
                >
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm font-medium text-primary">
              {isActive
                ? "Current mode"
                : isSubmitting
                  ? "Switching…"
                  : "Select →"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
