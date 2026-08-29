import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { SENTINEL_AGENT_NAME } from '../constants/sentinelAgent';
import {
  TrueForgeAdminClient,
  TrueForgeAdminError,
  parseModelFqn,
  resolveModelApiKey,
} from '../services/trueforgeAdmin.service';

loadEnv();

const setupEnvSchema = z.object({
  TRUEFORGE_BASE_URL: z.string().url().default('http://localhost:8790'),
  TRUEFORGE_TOKEN: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  TRUEFORGE_MODEL: z.string().min(1).default('anthropic/claude-sonnet-4-6'),
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
  if (!githubToken) {
    fail('Set GITHUB_TOKEN (or GITHUB_PAT) for the TrueForge GitHub MCP connector');
  }

  const { providerType, modelName } = parseModelFqn(env.TRUEFORGE_MODEL);
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

  log('Configuring model provider', `${providerType} / ${modelName}`);
  await client.upsertModelProvider({
    providerType,
    apiKey: modelApiKey,
    modelName,
  });

  log('Configuring GitHub MCP', 'github');
  await client.upsertGithubMcp({ token: githubToken });

  log('Configuring Daytona sandbox');
  await client.upsertDaytonaSandbox({ apiKey: env.DAYTONA_API_KEY });

  log('Waiting for sandbox provider');
  await client.waitForSandboxReady();
  log('Sandbox provider ready');

  log('Creating Sentinel agent', SENTINEL_AGENT_NAME);
  const agent = await client.upsertSentinelAgent(env.TRUEFORGE_MODEL);
  log(`Agent ${agent.action}`, `${agent.name}${agent.id ? ` (${agent.id})` : ''}`);

  console.log('');
  console.log('TrueForge setup complete.');
  console.log('');
  console.log('Add to server/.env (if not already set):');
  console.log(`  TRUEFORGE_BASE_URL=${env.TRUEFORGE_BASE_URL}`);
  console.log(`  TRUEFORGE_AGENT_NAME=${SENTINEL_AGENT_NAME}`);
  console.log(`  TRUEFORGE_MODEL=${env.TRUEFORGE_MODEL}`);
  if (env.TRUEFORGE_TOKEN) {
    console.log('  TRUEFORGE_TOKEN=<your token>');
  }
  console.log('');
  console.log('Then start Sentinel: npm run dev');
}

const PROVIDER_KEY_HINT: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  'google-gemini': 'GOOGLE_GEMINI_API_KEY',
};

main().catch((err) => {
  if (err instanceof TrueForgeAdminError) {
    fail(err.message);
  }
  fail(err instanceof Error ? err.message : String(err));
});
