import { Octokit } from '@octokit/rest';
import { StatusCodes } from 'http-status-codes';
import { Settings } from '../models/Settings';
import { AppError } from '../utils/AppError';
import { decryptSecret, encryptSecret } from '../utils/crypto';
import { logger } from '../utils/logger';

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

export async function listAllPullRequests(
  profileId: string,
): Promise<GitHubPullRequest[]> {
  const repos = await listRepos(profileId);
  const octokit = await getOctokit(profileId);
  const pulls: GitHubPullRequest[] = [];
  const cap = 500;

  for (const repo of repos) {
    if (pulls.length >= cap) break;
    try {
      const { data } = await octokit.rest.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'all',
        per_page: 30,
        sort: 'updated',
        direction: 'desc',
      });
      for (const pr of data) {
        if (pulls.length >= cap) break;
        pulls.push({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          repoFullName: repo.fullName,
          url: pr.html_url,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
        });
      }
    } catch (err) {
      logger.warn(`Failed to list PRs for ${repo.fullName}`, err);
    }
  }

  return pulls.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
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

  await octokit.rest.git.createRef({
    owner: input.owner,
    repo: input.repo,
    ref: `refs/heads/${branchName}`,
    sha: baseRef.data.object.sha,
  });

  // Apply patch by creating/updating files from diff hunks (simplified: store patch as commit message context)
  // For hackathon: create PR with patch in body; branch points to base (user sees diff in PR description)
  const { data: pr } = await octokit.rest.pulls.create({
    owner: input.owner,
    repo: input.repo,
    title: input.title,
    head: branchName,
    base,
    body: `${input.body}\n\n## Proposed patch\n\n\`\`\`diff\n${input.patch.slice(0, 60000)}\n\`\`\``,
  });

  return {
    prUrl: pr.html_url,
    prNumber: pr.number,
    diff: input.patch,
  };
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
