import { ModeCards } from "../../components/ModeCards";
import { useProfile } from "../../lib/ProfileContext";
import { useSwitchMode } from "../../lib/useSwitchMode";
import type { ProfileMode } from "../../lib/profile";

export default function ModeSelection() {
  const { profile } = useProfile();
  const { switchMode, switching, error } = useSwitchMode();

  const handleSelect = (mode: ProfileMode) => {
    void switchMode(mode);
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

        <ModeCards onSelect={handleSelect} submitting={switching} />

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
