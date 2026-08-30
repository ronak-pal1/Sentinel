export const SENTINEL_AGENT_NAME = 'sentinel';

export type SentinelAgentManifestOptions = {
  includeGithubMcp?: boolean;
};

function buildSentinelInstructions(includeGithubMcp: boolean): string {
  const toolsLine = includeGithubMcp
    ? 'Investigate production alerts using available tools (metrics, logs, deploys, GitHub MCP).'
    : 'Investigate production alerts using available tools (metrics, logs, deploys).';

  return `You are Sentinel, an SRE incident-response agent.
${toolsLine}
You have a sandbox (Daytona via TrueForge) for isolated code execution — use it to clone the repo, apply proposed patches, and run tests before any production change.
Be concise. Prefer read-only investigation first.
Propose fixes as unified diff patches in \`\`\`diff blocks.
Do NOT open PRs or push to GitHub — output the patch and sandbox verification results only.
When you propose a fix (PR / merge / redeploy), pause for human approval before mutating production.
Always state root cause hypothesis and confidence when diagnosis is ready.`;
}

export function buildSentinelAgentManifest(
  modelFqn: string,
  options?: SentinelAgentManifestOptions,
) {
  const includeGithubMcp = options?.includeGithubMcp ?? false;

  return {
    model: { name: modelFqn },
    instructions: buildSentinelInstructions(includeGithubMcp),
    config: {
      sandbox: { enabled: true, file_downloads: true },
    },
    ...(includeGithubMcp ? { mcp_servers: [{ name: 'github' }] } : {}),
  };
}
