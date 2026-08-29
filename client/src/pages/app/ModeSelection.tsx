import { useState } from "react";
import { setProfileMode } from "../../lib/api";
import { useProfile } from "../../lib/ProfileContext";
import type { ProfileMode } from "../../lib/profile";

const MODES: {
  id: ProfileMode;
  title: string;
  description: string;
  features: string[];
}[] = [
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

export default function ModeSelection() {
  const { profile, setProfile } = useProfile();
  const [submitting, setSubmitting] = useState<ProfileMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (mode: ProfileMode) => {
    if (!profile) return;
    setSubmitting(mode);
    setError(null);
    try {
      const updated = await setProfileMode(mode);
      setProfile({
        id: profile.id,
        token: profile.token,
        displayName: updated.displayName,
        mode: updated.mode ?? mode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set mode");
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 md:px-8 py-16 font-sans text-(--foreground-color)">
      <div className="w-full max-w-3xl">
        <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
          SENTINEL / MODE
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Choose your experience
        </h1>
        <p className="text-sm text-(--muted-color) mb-8">
          Hi {profile?.displayName}. Pick demo for a quick tour, or real mode to
          connect GitHub and run live incident response.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              disabled={submitting !== null}
              onClick={() => void handleSelect(mode.id)}
              className="text-left border border-(--border-color) bg-(--panel-color) p-6 hover:border-primary transition-colors disabled:opacity-60"
            >
              <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
                {mode.id.toUpperCase()}
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
                {submitting === mode.id ? "Setting up…" : "Select →"}
              </p>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
