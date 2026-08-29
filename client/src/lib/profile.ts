const PROFILE_ID_KEY = "sentinel-profile-id";
const PROFILE_TOKEN_KEY = "sentinel-profile-token";
const PROFILE_NAME_KEY = "sentinel-profile-name";

export type StoredProfile = {
  id: string;
  token: string;
  displayName: string;
};

export function getStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(PROFILE_ID_KEY);
  const token = localStorage.getItem(PROFILE_TOKEN_KEY);
  const displayName = localStorage.getItem(PROFILE_NAME_KEY);
  if (!id || !token || !displayName) return null;
  return { id, token, displayName };
}

export function saveProfile(profile: StoredProfile): void {
  localStorage.setItem(PROFILE_ID_KEY, profile.id);
  localStorage.setItem(PROFILE_TOKEN_KEY, profile.token);
  localStorage.setItem(PROFILE_NAME_KEY, profile.displayName);
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_ID_KEY);
  localStorage.removeItem(PROFILE_TOKEN_KEY);
  localStorage.removeItem(PROFILE_NAME_KEY);
}
