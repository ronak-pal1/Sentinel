import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { SENTINEL_AGENT_NAME } from '../constants/sentinelAgent';
import {
  OPENROUTER_DEFAULT_BASE_URL,
  TrueForgeAdminClient,
  TrueForgeAdminError,
  buildAgentModelFqn,
  isOpenRouterCustomProvider,
  parseModelFqn,
  resolveModelApiKey,
  validateDaytonaApiKey,
} from '../services/trueforgeAdmin.service';

loadEnv();

const setupEnvSchema = z.object({
  TRUEFORGE_BASE_URL: z.string().url().default('http://localhost:8790'),
  TRUEFORGE_TOKEN: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  TRUEFORGE_MODEL: z.string().min(1).default('openrouter/gemini-2.5-flash'),
  OPENROUTER_MODEL_ID: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  OPENROUTER_BASE_URL: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().url().optional(),
  ),
  DAYTONA_API_KEY: z.string().min(1, 'DAYTONA_API_KEY is required'),
  GITHUB_TOKEN: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  GITHUB_PAT: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
});

function log(step: string, detail?: string) {
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`[setup:trueforge] ${step}${suffix}`);
}

function warn(message: string) {
  console.warn(`[setup:trueforge] WARN: ${message}`);
}

function fail(message: string): never {
  console.error(`[setup:trueforge] ERROR: ${message}`);
  process.exit(1);
}

async function main() {
  const parsed = setupEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Missing or invalid environment variables for TrueForge setup:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  const env = parsed.data;
  const githubToken = env.GITHUB_TOKEN ?? env.GITHUB_PAT;

  const { providerType, modelName } = parseModelFqn(env.TRUEFORGE_MODEL);
  const useOpenRouterCustom = isOpenRouterCustomProvider(providerType);

  if (useOpenRouterCustom && !env.OPENROUTER_MODEL_ID) {
    fail(
      'Set OPENROUTER_MODEL_ID (e.g. google/gemini-2.5-flash) when using openrouter as the model provider',
    );
  }

  const modelApiKey = resolveModelApiKey(providerType, process.env);
  if (!modelApiKey) {
    const hint =
      PROVIDER_KEY_HINT[providerType] ??
      `MODEL_API_KEY for provider "${providerType}"`;
    fail(`Set ${hint} to configure the model provider`);
  }

  const client = new TrueForgeAdminClient({
    baseUrl: env.TRUEFORGE_BASE_URL,
    ...(env.TRUEFORGE_TOKEN ? { token: env.TRUEFORGE_TOKEN } : {}),
  });

  log('Checking TrueForge', env.TRUEFORGE_BASE_URL);
  try {
    await client.checkReachable();
  } catch (err) {
    const message =
      err instanceof TrueForgeAdminError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'TrueForge unreachable';
    fail(
      `${message}. Start TrueForge first: npx @truefoundry/trueforge`,
    );
  }

  const agentModelFqn = buildAgentModelFqn(providerType, modelName);

  if (useOpenRouterCustom) {
    const baseUrl = env.OPENROUTER_BASE_URL ?? OPENROUTER_DEFAULT_BASE_URL;
    const modelId = env.OPENROUTER_MODEL_ID!;
    log(
      'Configuring OpenRouter custom provider',
      `${modelId} as ${agentModelFqn}`,
    );
    await client.upsertCustomModelProvider({
      name: providerType,
      baseUrl,
      apiKey: modelApiKey,
      modelId,
      modelResourceName: modelName,
    });
    await client.verifyCustomModelProvider({
      providerName: providerType,
      modelResourceName: modelName,
      modelId,
    });
    log('OpenRouter model verified', `${agentModelFqn} -> ${modelId}`);
  } else {
    log('Configuring model provider', `${providerType} / ${modelName}`);
    await client.upsertModelProvider({
      providerType,
      apiKey: modelApiKey,
      modelName,
    });
  }

  const includeGithubMcp = Boolean(githubToken);
  if (includeGithubMcp) {
    log('Configuring GitHub MCP', 'github');
    await client.upsertGithubMcp({ token: githubToken! });
  } else {
    warn(
      'Skipping GitHub MCP — set GITHUB_TOKEN (or GITHUB_PAT) to enable GitHub tools on the agent',
    );
  }

  log('Creating Sentinel agent', SENTINEL_AGENT_NAME);
  const agent = await client.upsertSentinelAgent(agentModelFqn, { includeGithubMcp });
  const githubSuffix = includeGithubMcp ? ' (with GitHub MCP)' : ' (no GitHub MCP)';
  log(
    `Agent ${agent.action}`,
    `${agent.name} -> ${agentModelFqn}${githubSuffix}${agent.id ? ` (${agent.id})` : ''}`,
  );

  log('Validating Daytona API key');
  try {
    await validateDaytonaApiKey(env.DAYTONA_API_KEY);
    log('Daytona API key OK');
  } catch (err) {
    if (err instanceof TrueForgeAdminError) {
      fail(
        `${err.message}. Regenerate the key in Daytona with Sandboxes + Snapshots (write) access.`,
      );
    }
    throw err;
  }

  log('Configuring Daytona sandbox');
  try {
    const sandbox = await client.upsertDaytonaSandbox({ apiKey: env.DAYTONA_API_KEY });
    log('Daytona sandbox submitted', `status=${sandbox.data.status}`);

    log('Waiting for sandbox provider');
    await client.waitForSandboxReady({
      onStatus: (status, reason) => {
        if (reason) {
          log('Sandbox status', `${status} (${reason})`);
        } else {
          log('Sandbox status', status);
        }
      },
    });
    log('Sandbox provider ready');
  } catch (err) {
    const message =
      err instanceof TrueForgeAdminError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Daytona setup failed';
    warn(
      `Daytona sandbox not configured: ${message}. Open TrueForge → Settings → Sandbox providers, paste DAYTONA_API_KEY (needs write:snapshots + write:sandboxes), then re-run setup:trueforge.`,
    );
  }

  console.log('');
  console.log('TrueForge setup complete.');
  console.log('');
  console.log('Add to server/.env (if not already set):');
  console.log(`  TRUEFORGE_BASE_URL=${env.TRUEFORGE_BASE_URL}`);
  console.log(`  TRUEFORGE_AGENT_NAME=${SENTINEL_AGENT_NAME}`);
  console.log(`  TRUEFORGE_MODEL=${agentModelFqn}`);
  if (useOpenRouterCustom) {
    console.log(`  OPENROUTER_MODEL_ID=${env.OPENROUTER_MODEL_ID}`);
  }
  if (env.TRUEFORGE_TOKEN) {
    console.log('  TRUEFORGE_TOKEN=<your token>');
  }
  if (!githubToken) {
    console.log('  GITHUB_TOKEN=<your pat>  # optional but needed for GitHub MCP tools');
  }
  console.log('');
  console.log('Then start Sentinel: npm run dev');
}

const PROVIDER_KEY_HINT: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  'google-gemini': 'GOOGLE_GEMINI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

main().catch((err) => {
  if (err instanceof TrueForgeAdminError) {
    fail(err.message);
  }
  fail(err instanceof Error ? err.message : String(err));
});
