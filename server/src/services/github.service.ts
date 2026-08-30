import { Octokit } from '@octokit/rest';
import { StatusCodes } from 'http-status-codes';
import { Settings } from '../models/Settings';
import { Webhook } from '../models/Webhook';
import { AppError } from '../utils/AppError';
import { decryptSecret, encryptSecret } from '../utils/crypto';
import { logger } from '../utils/logger';

/** Max repos to scan for PRs — full account scans were timing out the UI. */
const PULLS_REPO_LIMIT = 20;
/** Concurrent GitHub pulls.list calls. */
const PULLS_CONCURRENCY = 5;
/** PRs to keep after merge/sort. */
const PULLS_RESULT_CAP = 100;

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

async function getOctokit(profileId: string): Promise<Octokit> {
  const settings = await Settings.findOne({ profileId }).lean();
  if (!settings?.githubTokenEncrypted) {
    throw new AppError('GitHub not connected', StatusCodes.BAD_REQUEST);
  }
  const token = decryptSecret(settings.githubTokenEncrypted);
  return new Octokit({ auth: token });
}

export async function connectToken(
  profileId: string,
  token: string,
): Promise<{ connected: boolean; username: string | null }> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.users.getAuthenticated();
  await Settings.findOneAndUpdate(
    { profileId },
    {
      $set: {
        githubTokenEncrypted: encryptSecret(token),
        githubConnectedAt: new Date().toISOString(),
        githubUsername: data.login,
      },
    },
    { upsert: true },
  );
  return { connected: true, username: data.login };
}

export async function disconnectToken(profileId: string): Promise<void> {
  await Settings.findOneAndUpdate(
    { profileId },
    {
      $unset: {
        githubTokenEncrypted: 1,
        githubConnectedAt: 1,
        githubUsername: 1,
      },
    },
  );
}

export async function getStatus(
  profileId: string,
): Promise<{ connected: boolean; username: string | null }> {
  const settings = await Settings.findOne({ profileId }).lean();
  return {
    connected: Boolean(settings?.githubTokenEncrypted),
    username: settings?.githubUsername ?? null,
  };
}

export async function listRepos(profileId: string): Promise<GitHubRepo[]> {
  const octokit = await getOctokit(profileId);
  const repos: GitHubRepo[] = [];
  let page = 1;
  while (page <= 5) {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      sort: 'updated',
    });
    if (data.length === 0) break;
    repos.push(
      ...data.map((r) => ({
        id: r.id,
        owner: r.owner?.login ?? '',
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        defaultBranch: r.default_branch,
      })),
    );
    if (data.length < 100) break;
    page += 1;
  }
  return repos;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * Lists recent PRs without scanning every repo the user can access.
 * Prefer webhook-linked repos, then fill with recently updated repos.
 */
export async function listAllPullRequests(
  profileId: string,
): Promise<GitHubPullRequest[]> {
  const [octokit, allRepos, webhooks] = await Promise.all([
    getOctokit(profileId),
    listRepos(profileId),
    Webhook.find({ profileId }).lean(),
  ]);

  const byFullName = new Map(allRepos.map((r) => [r.fullName, r]));
  const selected: GitHubRepo[] = [];
  const seen = new Set<string>();

  for (const wh of webhooks) {
    const fullName = `${wh.githubOwner}/${wh.githubRepo}`;
    if (seen.has(fullName)) continue;
    const repo = byFullName.get(fullName);
    if (repo) {
      selected.push(repo);
      seen.add(fullName);
    } else {
      selected.push({
        id: 0,
        owner: wh.githubOwner,
        name: wh.githubRepo,
        fullName,
        private: false,
        defaultBranch: 'main',
      });
      seen.add(fullName);
    }
    if (selected.length >= PULLS_REPO_LIMIT) break;
  }

  for (const repo of allRepos) {
    if (selected.length >= PULLS_REPO_LIMIT) break;
    if (seen.has(repo.fullName)) continue;
    selected.push(repo);
    seen.add(repo.fullName);
  }

  const batches = await mapPool(selected, PULLS_CONCURRENCY, async (repo) => {
    try {
      const { data } = await octokit.rest.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'all',
        per_page: 20,
        sort: 'updated',
        direction: 'desc',
      });
      return data.map(
        (pr): GitHubPullRequest => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          repoFullName: repo.fullName,
          url: pr.html_url,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
        }),
      );
    } catch (err) {
      logger.warn(`Failed to list PRs for ${repo.fullName}`, err);
      return [] as GitHubPullRequest[];
    }
  });

  return batches
    .flat()
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, PULLS_RESULT_CAP);
}

export async function fetchRepoContext(
  profileId: string,
  owner: string,
  repo: string,
  maxFiles = 8,
): Promise<string> {
  const octokit = await getOctokit(profileId);
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: 'HEAD',
    recursive: '1',
  });

  const codeFiles = (tree.tree ?? [])
    .filter(
      (f) =>
        f.type === 'blob' &&
        f.path &&
        /\.(ts|tsx|js|jsx|py|go|rs|java|json|yaml|yml|md)$/.test(f.path) &&
        !f.path.includes('node_modules') &&
        !f.path.includes('dist/'),
    )
    .slice(0, maxFiles);

  const chunks: string[] = [];
  for (const file of codeFiles) {
    if (!file.path || !file.sha) continue;
    try {
      const { data: blob } = await octokit.rest.git.getBlob({
        owner,
        repo,
        file_sha: file.sha,
      });
      const content = Buffer.from(blob.content, 'base64').toString('utf8');
      chunks.push(`--- ${file.path} ---\n${content.slice(0, 4000)}`);
    } catch {
      // skip unreadable files
    }
  }

  return chunks.join('\n\n');
}

export async function createPullRequest(
  profileId: string,
  input: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    patch: string;
    baseBranch?: string;
  },
): Promise<{ prUrl: string; prNumber: number; diff: string }> {
  const octokit = await getOctokit(profileId);
  const repoInfo = await octokit.rest.repos.get({
    owner: input.owner,
    repo: input.repo,
  });
  const base = input.baseBranch ?? repoInfo.data.default_branch;
  const branchName = `sentinel-fix-${Date.now()}`;

  const baseRef = await octokit.rest.git.getRef({
    owner: input.owner,
    repo: input.repo,
    ref: `heads/${base}`,
  });
  const baseSha = baseRef.data.object.sha;

  const baseCommit = await octokit.rest.git.getCommit({
    owner: input.owner,
    repo: input.repo,
    commit_sha: baseSha,
  });

  // GitHub rejects PRs with no commits between head and base — commit the
  // proposed patch as a real file so the branch diverges.
  const patchBody = input.patch.slice(0, 60000);
  const summaryBody = [
    '# Sentinel proposed fix',
    '',
    input.body,
    '',
    '## Patch',
    '',
    '```diff',
    patchBody,
    '```',
    '',
  ].join('\n');

  const [patchBlob, summaryBlob] = await Promise.all([
    octokit.rest.git.createBlob({
      owner: input.owner,
      repo: input.repo,
      content: Buffer.from(patchBody, 'utf8').toString('base64'),
      encoding: 'base64',
    }),
    octokit.rest.git.createBlob({
      owner: input.owner,
      repo: input.repo,
      content: Buffer.from(summaryBody, 'utf8').toString('base64'),
      encoding: 'base64',
    }),
  ]);

  const { data: tree } = await octokit.rest.git.createTree({
    owner: input.owner,
    repo: input.repo,
    base_tree: baseCommit.data.tree.sha,
    tree: [
      {
        path: '.sentinel/proposed-fix.patch',
        mode: '100644',
        type: 'blob',
        sha: patchBlob.data.sha,
      },
      {
        path: '.sentinel/SENTINEL_FIX.md',
        mode: '100644',
        type: 'blob',
        sha: summaryBlob.data.sha,
      },
    ],
  });

  const { data: commit } = await octokit.rest.git.createCommit({
    owner: input.owner,
    repo: input.repo,
    message: input.title,
    tree: tree.sha,
    parents: [baseSha],
  });

  await octokit.rest.git.createRef({
    owner: input.owner,
    repo: input.repo,
    ref: `refs/heads/${branchName}`,
    sha: commit.sha,
  });

  const { data: pr } = await octokit.rest.pulls.create({
    owner: input.owner,
    repo: input.repo,
    title: input.title,
    head: branchName,
    base,
    body: `${input.body}\n\n## Proposed patch\n\n\`\`\`diff\n${patchBody}\n\`\`\`\n\n_Also committed under \`.sentinel/\` on this branch._`,
  });

  return {
    prUrl: pr.html_url,
    prNumber: pr.number,
    diff: input.patch,
  };
}

export async function mergePullRequest(
  profileId: string,
  input: {
    owner: string;
    repo: string;
    pullNumber: number;
    commitTitle?: string;
  },
): Promise<{ merged: boolean; message: string; sha?: string }> {
  const octokit = await getOctokit(profileId);
  try {
    const { data } = await octokit.rest.pulls.merge({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
      merge_method: 'merge',
      ...(input.commitTitle ? { commit_title: input.commitTitle } : {}),
    });
    return {
      merged: Boolean(data.merged),
      message: data.message ?? (data.merged ? 'Pull request merged' : 'Merge did not complete'),
      ...(data.sha ? { sha: data.sha } : {}),
    };
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: unknown }).status)
        : undefined;
    const message =
      err instanceof Error ? err.message : 'Failed to merge pull request';

    if (status === 405 || status === 409) {
      throw new AppError(
        `Cannot merge PR #${input.pullNumber}: ${message}`,
        StatusCodes.CONFLICT,
      );
    }
    if (status === 403 || status === 404) {
      throw new AppError(
        `Cannot merge PR #${input.pullNumber}: check that the GitHub token has write access to ${input.owner}/${input.repo}. ${message}`,
        StatusCodes.FORBIDDEN,
      );
    }
    throw new AppError(message, StatusCodes.BAD_GATEWAY);
  }
}

export async function testConnection(
  profileId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const octokit = await getOctokit(profileId);
    const { data } = await octokit.rest.users.getAuthenticated();
    return { ok: true, message: `Connected as ${data.login}` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'GitHub connection failed',
    };
  }
}
