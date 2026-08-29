import { useEffect, useState } from "react";
import { listGitHubPulls, type GitHubPullRequest } from "../../lib/api";

export default function PullRequests() {
  const [pulls, setPulls] = useState<GitHubPullRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listGitHubPulls()
      .then(setPulls)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load PRs"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-8 py-20 text-sm text-(--muted-color)">
        Loading pull requests…
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 py-8 pb-20 font-sans text-(--foreground-color)">
      <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
        SENTINEL / PULL REQUESTS
      </p>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Pull requests</h1>
      <p className="text-(--muted-color) text-sm mb-8">
        Open and closed pull requests across your connected GitHub repositories.
      </p>

      {error ? (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {pulls.length === 0 ? (
        <p className="text-sm text-(--muted-color)">No pull requests found.</p>
      ) : (
        <div className="border border-(--border-color) overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-(--surface-color) border-b border-(--border-color) text-[10px] font-mono tracking-widest text-(--muted-color)">
            <span className="col-span-1">#</span>
            <span className="col-span-4">TITLE</span>
            <span className="col-span-3">REPO</span>
            <span className="col-span-2">STATE</span>
            <span className="col-span-2">UPDATED</span>
          </div>
          {pulls.map((pr) => (
            <a
              key={`${pr.repoFullName}-${pr.number}`}
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2 px-4 py-3.5 border-b border-(--border-color) last:border-0 hover:bg-(--surface-color)/60 transition-colors"
            >
              <span className="md:col-span-1 font-mono text-[12px]">
                {pr.number}
              </span>
              <span className="md:col-span-4 text-sm font-medium truncate">
                {pr.title}
              </span>
              <span className="md:col-span-3 text-sm text-(--muted-color) truncate font-mono text-[12px]">
                {pr.repoFullName}
              </span>
              <span className="md:col-span-2 text-sm capitalize text-(--muted-color)">
                {pr.state}
              </span>
              <span className="md:col-span-2 font-mono text-[11px] text-(--muted-color)">
                {new Date(pr.updatedAt).toLocaleDateString()}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
