import { clearProfile, getStoredProfile, type StoredProfile } from "./profile";
import type { ProfileMode } from "./profile";
import type { Incident, LogEvent, MetricPoint } from "./types";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type PublicProfile = {
  id: string;
  displayName: string;
  createdAt: string;
  mode: ProfileMode | null;
};

export type CreatedProfile = PublicProfile & {
  token: string;
  mode: ProfileMode | null;
};

export type GitHubStatus = {
  connected: boolean;
  username: string | null;
};

export type GitHubRepo = {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
};

export type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  state: string;
  repoFullName: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type WebhookRecord = {
  id: string;
  name: string;
  githubOwner: string;
  githubRepo: string;
  serviceName: string;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  url: string;
};

export type CreatedWebhook = WebhookRecord & {
  secret: string;
};

export type PublicSettings = {
  connectors: { name: string; status: string; detail: string }[];
  sandboxLimits: {
    maxReplay: number;
    timeoutSec: number;
    isolation: string;
    network: string;
  };
  hasApiKey: boolean;
  modelApiKeyMasked: string | null;
  githubConnected: boolean;
  githubUsername: string | null;
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

export async function setProfileMode(
  mode: ProfileMode,
): Promise<PublicProfile> {
  return apiFetch<PublicProfile>("/api/profiles/mode", {
    method: "PATCH",
    body: JSON.stringify({ mode }),
  });
}

// Incidents
export async function listIncidents(): Promise<Incident[]> {
  return apiFetch<Incident[]>("/api/incidents");
}

export async function getIncident(id: string): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}`);
}

export async function approveIncident(
  id: string,
  approvedBy = "you",
): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ approvedBy }),
  });
}

export async function rejectIncident(
  id: string,
  reason?: string,
): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export async function retryIncident(id: string): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}/retry`, { method: "POST" });
}

export async function escalateIncident(id: string): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}/escalate`, {
    method: "POST",
  });
}

export async function closeIncident(id: string): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}/close`, { method: "POST" });
}

export async function listIncidentEvents(id: string): Promise<LogEvent[]> {
  return apiFetch<LogEvent[]>(`/api/incidents/${id}/events`);
}

export async function getIncidentMetrics(id: string): Promise<MetricPoint[]> {
  const raw = await apiFetch<{ t: number; latencyMs: number; errorRate: number }[]>(
    `/api/incidents/${id}/metrics`,
  );
  return raw.map((p) => ({
    t: p.t,
    latencyMs: p.latencyMs,
    errorRate: p.errorRate,
  }));
}

export async function getLiveMetrics(): Promise<MetricPoint[]> {
  const raw = await apiFetch<{ t: number; latencyMs: number; errorRate: number }[]>(
    "/api/metrics/live",
  );
  return raw.map((p) => ({
    t: p.t,
    latencyMs: p.latencyMs,
    errorRate: p.errorRate,
  }));
}

// GitHub
export async function connectGitHub(token: string): Promise<GitHubStatus> {
  return apiFetch<GitHubStatus>("/api/github/connect", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function disconnectGitHub(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/github/disconnect", {
    method: "DELETE",
  });
}

export async function getGitHubStatus(): Promise<GitHubStatus> {
  return apiFetch<GitHubStatus>("/api/github/status");
}

export async function listGitHubRepos(): Promise<GitHubRepo[]> {
  return apiFetch<GitHubRepo[]>("/api/github/repos");
}

export async function listGitHubPulls(): Promise<GitHubPullRequest[]> {
  return apiFetch<GitHubPullRequest[]>("/api/github/pulls");
}

// Webhooks
export async function listWebhooks(): Promise<WebhookRecord[]> {
  return apiFetch<WebhookRecord[]>("/api/webhooks");
}

export async function createWebhook(input: {
  name: string;
  githubOwner: string;
  githubRepo: string;
  serviceName?: string;
}): Promise<CreatedWebhook> {
  return apiFetch<CreatedWebhook>("/api/webhooks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/webhooks/${id}`, {
    method: "DELETE",
  });
}

// Settings
export async function getSettings(): Promise<PublicSettings> {
  return apiFetch<PublicSettings>("/api/settings");
}

export async function updateSettings(input: {
  modelApiKey?: string;
  clearModelApiKey?: boolean;
}): Promise<PublicSettings> {
  return apiFetch<PublicSettings>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function testConnector(name: string): Promise<{
  name: string;
  ok: boolean;
  message: string;
}> {
  return apiFetch(`/api/connectors/${encodeURIComponent(name)}/test`, {
    method: "POST",
  });
}
