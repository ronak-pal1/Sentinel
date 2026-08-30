import { useCallback, useState } from "react";
import { setProfileMode } from "./api";
import { useProfile } from "./ProfileContext";
import type { ProfileMode } from "./profile";

export function useSwitchMode() {
  const { profile, setProfile } = useProfile();
  const [switching, setSwitching] = useState<ProfileMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const switchMode = useCallback(
    async (mode: ProfileMode) => {
      if (!profile) return false;
      if (profile.mode === mode) return true;

      setSwitching(mode);
      setError(null);
      try {
        const updated = await setProfileMode(mode);
        setProfile({
          id: profile.id,
          token: profile.token,
          displayName: updated.displayName,
          mode: updated.mode ?? mode,
        });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not set mode");
        return false;
      } finally {
        setSwitching(null);
      }
    },
    [profile, setProfile],
  );

  return { switchMode, switching, error, clearError: () => setError(null) };
}
