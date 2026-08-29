import { useEffect, useState } from "react";
import { StatusPill } from "../../components/dashboard/StatusPill";
import {
  connectGitHub,
  disconnectGitHub,
  getGitHubStatus,
  getSettings,
  testConnector,
  updateSettings,
  type PublicSettings,
} from "../../lib/api";
import { useProfile } from "../../lib/ProfileContext";

const demoConnectors = [
  { name: "GitHub MCP", status: "Connected" as const, detail: "PRs · reviews · merge" },
  { name: "Sandbox", status: "Connected" as const, detail: "Ephemeral clone · traffic replay" },
  { name: "Metrics source", status: "Connected" as const, detail: "Grafana · checkout-svc" },
];

export default function Settings() {
  const { mode } = useProfile();
  const isDemo = mode !== "real";

  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [modelKey, setModelKey] = useState("");
  const [githubStatus, setGithubStatus] = useState<{
    connected: boolean;
    username: string | null;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    void Promise.all([getSettings(), getGitHubStatus()])
      .then(([s, gh]) => {
        setSettings(s);
        setGithubStatus(gh);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load settings"),
      )
      .finally(() => setLoading(false));
  }, [isDemo]);

  const handleConnectGitHub = async () => {
    setError(null);
    setMessage(null);
    try {
      const status = await connectGitHub(githubToken.trim());
      setGithubStatus(status);
      setGithubToken("");
      setMessage(`Connected as ${status.username}`);
      const s = await getSettings();
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub connect failed");
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await disconnectGitHub();
      setGithubStatus({ connected: false, username: null });
      setMessage("GitHub disconnected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    }
  };

  const handleSaveModelKey = async () => {
    try {
      const s = await updateSettings({ modelApiKey: modelKey.trim() });
      setSettings(s);
      setModelKey("");
      setMessage("Model API key saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleTest = async (name: string) => {
    try {
      const result = await testConnector(name);
      setMessage(`${result.name}: ${result.message}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    }
  };

  if (isDemo) {
    return (
      <div className="px-4 sm:px-6 md:px-8 py-8 pb-20 font-sans text-(--foreground-color) max-w-2xl">
        <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
          SENTINEL / SETTINGS
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Connections</h1>
        <p className="text-(--muted-color) text-sm mb-10">
          Demo mode — all connectors are mocked. No authentication is required to
          run Break It.
        </p>

        <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
          MCP SERVERS
        </h2>
        <ul className="border border-(--border-color) mb-10 divide-y divide-stone-200">
          {demoConnectors.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between gap-4 px-4 py-4 bg-(--panel-color)"
            >
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-[11px] font-mono text-(--muted-color) mt-0.5 tracking-wide">
                  {c.detail}
                </p>
              </div>
              <StatusPill status="healthy" label="Connected" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-8 py-20 text-sm text-(--muted-color)">Loading settings…</div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 py-8 pb-20 font-sans text-(--foreground-color) max-w-2xl">
      <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
        SENTINEL / SETTINGS · REAL
      </p>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Connections</h1>
      <p className="text-(--muted-color) text-sm mb-8">
        Connect GitHub with a Personal Access Token, then create webhooks to receive
        alerts.
      </p>

      {message ? (
        <p className="mb-4 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
        GITHUB
      </h2>
      <div className="border border-(--border-color) bg-(--panel-color) px-4 py-4 mb-10 space-y-3">
        {githubStatus?.connected ? (
          <>
            <p className="text-sm">
              Connected as{" "}
              <span className="font-mono">{githubStatus.username}</span>
            </p>
            <button
              type="button"
              onClick={() => void handleDisconnectGitHub()}
              className="text-sm text-red-600 hover:underline"
            >
              Disconnect
            </button>
            <button
              type="button"
              onClick={() => void handleTest("GitHub")}
              className="ml-4 text-sm text-[#B8791F] hover:underline"
            >
              Test connection
            </button>
          </>
        ) : (
          <>
            <label className="block">
              <span className="text-[11px] font-mono tracking-widest text-(--muted-color)">
                PERSONAL ACCESS TOKEN
              </span>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="mt-2 w-full bg-(--surface-color) border border-(--border-color) px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleConnectGitHub()}
              disabled={!githubToken.trim()}
              className="bg-primary hover:bg-[#e0a240] disabled:opacity-60 text-black font-medium px-4 py-2 text-sm"
            >
              Connect GitHub
            </button>
          </>
        )}
      </div>

      <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
        CONNECTORS
      </h2>
      <ul className="border border-(--border-color) mb-10 divide-y divide-stone-200">
        {(settings?.connectors ?? []).map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between gap-4 px-4 py-4 bg-(--panel-color)"
          >
            <div>
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-[11px] font-mono text-(--muted-color) mt-0.5">
                {c.detail}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleTest(c.name)}
              className="text-[11px] font-mono text-[#B8791F] hover:underline"
            >
              TEST
            </button>
          </li>
        ))}
      </ul>

      <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
        MODEL PROVIDER
      </h2>
      <div className="border border-(--border-color) bg-(--surface-color) px-4 py-4 mb-10 space-y-3">
        {settings?.modelApiKeyMasked ? (
          <p className="text-sm font-mono text-(--muted-color)">
            Key saved: {settings.modelApiKeyMasked}
          </p>
        ) : null}
        <input
          type="password"
          value={modelKey}
          onChange={(e) => setModelKey(e.target.value)}
          placeholder="sk-…"
          className="w-full bg-(--panel-color) border border-(--border-color) px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => void handleSaveModelKey()}
          disabled={!modelKey.trim()}
          className="bg-primary hover:bg-[#e0a240] disabled:opacity-60 text-black font-medium px-4 py-2 text-sm"
        >
          Save API key
        </button>
      </div>

      {settings?.sandboxLimits ? (
        <>
          <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
            SANDBOX LIMITS
          </h2>
          <div className="border border-(--border-color) bg-(--panel-color) px-4 py-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
                MAX REPLAY
              </p>
              <p className="font-mono mt-1">{settings.sandboxLimits.maxReplay} requests</p>
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
                TIMEOUT
              </p>
              <p className="font-mono mt-1">{settings.sandboxLimits.timeoutSec}s</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
