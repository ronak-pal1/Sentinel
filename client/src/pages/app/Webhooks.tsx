import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createWebhook,
  deleteWebhook,
  listGitHubRepos,
  listWebhooks,
  type CreatedWebhook,
  type GitHubRepo,
  type WebhookRecord,
} from "../../lib/api";

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [name, setName] = useState("");
  const [repoFullName, setRepoFullName] = useState("");
  const [created, setCreated] = useState<CreatedWebhook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([listWebhooks(), listGitHubRepos()])
      .then(([wh, r]) => {
        setWebhooks(wh);
        setRepos(r);
        if (r[0]) setRepoFullName(r[0].fullName);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load webhooks"),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const repo = repos.find((r) => r.fullName === repoFullName);
    if (!repo) {
      setError("Select a repository");
      return;
    }
    try {
      const wh = await createWebhook({
        name: name.trim() || `${repo.name} alerts`,
        githubOwner: repo.owner,
        githubRepo: repo.name,
        serviceName: repo.name,
      });
      setCreated(wh);
      setWebhooks((prev) => [wh, ...prev]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="px-8 py-20 text-sm text-(--muted-color)">Loading webhooks…</div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 py-8 pb-20 font-sans text-(--foreground-color) max-w-3xl">
      <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
        SENTINEL / WEBHOOKS
      </p>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Alert webhooks</h1>
      <p className="text-(--muted-color) text-sm mb-8">
        Create a webhook linked to a GitHub repository. Paste the URL into Grafana,
        PagerDuty, or your alert system. Include the{" "}
        <code className="font-mono text-xs">X-Sentinel-Secret</code> header on each
        POST.
      </p>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {repos.length === 0 ? (
        <div className="border border-dashed border-(--border-color) p-6 mb-8">
          <p className="text-sm text-(--muted-color)">
            Connect GitHub in{" "}
            <Link to="/app/settings" className="text-[#B8791F] hover:underline">
              Settings
            </Link>{" "}
            before creating webhooks.
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="border border-(--border-color) bg-(--panel-color) p-6 mb-8 space-y-4"
        >
          <div>
            <label className="block text-[11px] font-mono tracking-widest text-(--muted-color) mb-2">
              NAME
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="checkout-svc alerts"
              className="w-full border border-(--border-color) bg-(--surface-color) px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono tracking-widest text-(--muted-color) mb-2">
              GITHUB REPOSITORY
            </label>
            <select
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
              className="w-full border border-(--border-color) bg-(--surface-color) px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {repos.map((r) => (
                <option key={r.id} value={r.fullName}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-[#e0a240] text-black font-medium px-4 py-2 text-sm"
          >
            Create webhook
          </button>
        </form>
      )}

      {created ? (
        <div className="border-2 border-[#EDA53B] bg-(--panel-color) p-6 mb-8">
          <p className="text-[11px] font-mono tracking-widest text-[#B8791F] mb-3">
            WEBHOOK CREATED — COPY NOW (SECRET SHOWN ONCE)
          </p>
          <div className="space-y-3 text-sm font-mono">
            <div>
              <p className="text-[10px] text-(--muted-color) mb-1">URL</p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 break-all text-xs">{created.url}</code>
                <button
                  type="button"
                  onClick={() => void copyText(created.url)}
                  className="text-[#B8791F] text-xs shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-(--muted-color) mb-1">
                X-Sentinel-Secret
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 break-all text-xs">{created.secret}</code>
                <button
                  type="button"
                  onClick={() => void copyText(created.secret)}
                  className="text-[#B8791F] text-xs shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="mt-4 text-xs text-(--muted-color) hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
        YOUR WEBHOOKS
      </h2>
      {webhooks.length === 0 ? (
        <p className="text-sm text-(--muted-color)">No webhooks yet.</p>
      ) : (
        <ul className="border border-(--border-color) divide-y divide-stone-200">
          {webhooks.map((wh) => (
            <li key={wh.id} className="px-4 py-4 bg-(--panel-color)">
              <div className="flex justify-between gap-4 items-start">
                <div>
                  <p className="font-medium text-sm">{wh.name}</p>
                  <p className="text-[11px] font-mono text-(--muted-color) mt-1">
                    {wh.githubOwner}/{wh.githubRepo}
                  </p>
                  <p className="text-[11px] font-mono text-(--muted-color) mt-1 break-all">
                    {wh.url}
                  </p>
                  {wh.lastTriggeredAt ? (
                    <p className="text-[11px] text-(--muted-color) mt-1">
                      Last triggered{" "}
                      {new Date(wh.lastTriggeredAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(wh.id)}
                  className="text-xs text-red-600 hover:underline shrink-0"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
