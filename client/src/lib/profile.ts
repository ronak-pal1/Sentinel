const PROFILE_ID_KEY = "sentinel-profile-id";
const PROFILE_TOKEN_KEY = "sentinel-profile-token";
const PROFILE_NAME_KEY = "sentinel-profile-name";
const PROFILE_MODE_KEY = "sentinel-profile-mode";

export type ProfileMode = "demo" | "real";

export type StoredProfile = {
  id: string;
  token: string;
  displayName: string;
  mode?: ProfileMode | null;
};

export function getStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(PROFILE_ID_KEY);
  const token = localStorage.getItem(PROFILE_TOKEN_KEY);
  const displayName = localStorage.getItem(PROFILE_NAME_KEY);
  if (!id || !token || !displayName) return null;
  const modeRaw = localStorage.getItem(PROFILE_MODE_KEY);
  const mode =
    modeRaw === "demo" || modeRaw === "real" ? modeRaw : null;
  return { id, token, displayName, mode };
}

export function saveProfile(profile: StoredProfile): void {
  localStorage.setItem(PROFILE_ID_KEY, profile.id);
  localStorage.setItem(PROFILE_TOKEN_KEY, profile.token);
  localStorage.setItem(PROFILE_NAME_KEY, profile.displayName);
  if (profile.mode) {
    localStorage.setItem(PROFILE_MODE_KEY, profile.mode);
  } else {
    localStorage.removeItem(PROFILE_MODE_KEY);
  }
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_ID_KEY);
  localStorage.removeItem(PROFILE_TOKEN_KEY);
  localStorage.removeItem(PROFILE_NAME_KEY);
  localStorage.removeItem(PROFILE_MODE_KEY);
}
