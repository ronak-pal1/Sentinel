import { clearProfile, getStoredProfile, type StoredProfile } from "./profile";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type PublicProfile = {
  id: string;
  displayName: string;
  createdAt: string;
};

export type CreatedProfile = PublicProfile & {
  token: string;
};

function authHeaders(profile: StoredProfile): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Profile-Id": profile.id,
    "X-Profile-Token": profile.token,
  };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const profile = getStoredProfile();
  if (!profile) {
    throw new Error("No profile credentials");
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      ...authHeaders(profile),
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401) {
    clearProfile();
    window.location.href = "/app";
    throw new Error("Profile credentials invalid");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

export async function createProfile(
  displayName: string,
): Promise<CreatedProfile> {
  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Failed to create profile");
  }

  const payload = (await response.json()) as ApiResponse<CreatedProfile>;
  return payload.data;
}

export async function getProfile(): Promise<PublicProfile> {
  return apiFetch<PublicProfile>("/api/profiles/me");
}
