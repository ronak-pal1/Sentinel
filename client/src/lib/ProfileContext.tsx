import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProfile } from "./api";
import {
  clearProfile,
  getStoredProfile,
  saveProfile,
  type StoredProfile,
} from "./profile";

type ProfileContextValue = {
  profile: StoredProfile | null;
  loading: boolean;
  setProfile: (profile: StoredProfile) => void;
  clearProfile: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<StoredProfile | null>(() =>
    getStoredProfile(),
  );
  const [loading, setLoading] = useState(Boolean(getStoredProfile()));

  useEffect(() => {
    const stored = getStoredProfile();
    if (!stored) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void getProfile()
      .then((remote) => {
        if (cancelled) return;
        const next: StoredProfile = {
          id: remote.id,
          token: stored.token,
          displayName: remote.displayName,
        };
        saveProfile(next);
        setProfileState(next);
      })
      .catch(() => {
        if (cancelled) return;
        clearProfile();
        setProfileState(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setProfile = useCallback((next: StoredProfile) => {
    saveProfile(next);
    setProfileState(next);
    setLoading(false);
  }, []);

  const handleClearProfile = useCallback(() => {
    clearProfile();
    setProfileState(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      loading,
      setProfile,
      clearProfile: handleClearProfile,
    }),
    [profile, loading, setProfile, handleClearProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}
