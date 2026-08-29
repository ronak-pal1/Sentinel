import {
  SENTINEL_AGENT_NAME,
  buildSentinelAgentManifest,
} from '../constants/sentinelAgent';

type HttpMethod = 'GET' | 'PUT' | 'POST';

export type TrueForgeAdminConfig = {
  baseUrl: string;
  token?: string;
};

type ApiError = {
  error?: { message?: string };
};

export class TrueForgeAdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'TrueForgeAdminError';
  }
}

export class TrueForgeAdminClient {
  constructor(private readonly config: TrueForgeAdminConfig) {}

  private url(path: string): string {
    const base = this.config.baseUrl.replace(/\/$/, '');
    return `${base}/api/v1${path}`;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }
    return headers;
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      headers: this.headers(),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(this.url(path), init);

    const text = await response.text();
    let payload: unknown = undefined;
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload &&
        'error' in payload &&
        typeof (payload as ApiError).error?.message === 'string'
          ? (payload as ApiError).error!.message!
          : `TrueForge ${method} ${path} failed (${response.status})`;
      throw new TrueForgeAdminError(message, response.status);
    }

    return payload as T;
  }

  async checkReachable(): Promise<void> {
    await this.request('GET', '/capabilities');
  }

  async getSandboxCatalog() {
    return this.request<{
      data: Array<{
        type: 'daytona';
        exec_timeout_ms: number;
        auto_stop_interval_in_minutes: number;
        auto_archive_interval_in_minutes: number;
        auto_delete_interval_in_minutes: number;
      }>;
    }>('GET', '/catalogs/sandbox-providers');
  }

  async getModelCatalog() {
    return this.request<{
      data: Array<{
        type: string;
        models?: Array<{
          model_id: string;
          name: string;
          properties?: Record<string, unknown>;
        }>;
      }>;
    }>('GET', '/catalogs/model-providers');
  }

  async getMcpCatalog() {
    return this.request<{
      data: Array<{
        type: 'remote';
        name: string;
        url: string;
        description: string;
        auth?: { type: string; headers?: Record<string, string> };
      }>;
    }>('GET', '/catalogs/mcp-servers');
  }

  async upsertModelProvider(input: {
    providerType: string;
    apiKey: string;
    modelName: string;
  }) {
    const catalog = await this.getModelCatalog();
    const preset = catalog.data.find((entry) => entry.type === input.providerType);
    if (!preset) {
      throw new TrueForgeAdminError(
        `Unknown model provider type "${input.providerType}" in TRUEFORGE_MODEL`,
        400,
      );
    }

    const catalogModel = preset.models?.find(
      (model) => model.name === input.modelName || model.model_id === input.modelName,
    );
    if (!catalogModel) {
      throw new TrueForgeAdminError(
        `Model "${input.modelName}" not found in TrueForge catalog for provider "${input.providerType}"`,
        400,
      );
    }

    const manifest: Record<string, unknown> = {
      type: input.providerType,
      auth: { api_key: input.apiKey },
      models: [
        {
          model_id: catalogModel.model_id,
          name: catalogModel.name,
          properties: catalogModel.properties ?? {},
        },
      ],
    };

    if (input.providerType === 'custom' && 'name' in preset) {
      manifest.name = (preset as { name?: string }).name;
      manifest.base_url = (preset as { base_url?: string }).base_url;
    }

    return this.request('PUT', '/settings/model-providers', { manifest });
  }

  async upsertGithubMcp(input: { token: string }) {
    const catalog = await this.getMcpCatalog();
    const github = catalog.data.find((entry) => entry.name === 'github');
    if (!github) {
      throw new TrueForgeAdminError('GitHub MCP preset not found in TrueForge catalog', 500);
    }

    return this.request('PUT', '/settings/mcp-servers', {
      manifest: {
        type: github.type,
        name: github.name,
        url: github.url,
        description: github.description,
        auth: {
          type: 'header',
          headers: {
            Authorization: `Bearer ${input.token}`,
          },
        },
      },
    });
  }

  async upsertDaytonaSandbox(input: { apiKey: string }) {
    const catalog = await this.getSandboxCatalog();
    const daytona = catalog.data.find((entry) => entry.type === 'daytona');
    if (!daytona) {
      throw new TrueForgeAdminError('Daytona sandbox preset not found in TrueForge catalog', 500);
    }

    return this.request('PUT', '/settings/sandbox-providers', {
      manifest: {
        type: daytona.type,
        auth: { api_key: input.apiKey },
        exec_timeout_ms: daytona.exec_timeout_ms,
        auto_stop_interval_in_minutes: daytona.auto_stop_interval_in_minutes,
        auto_archive_interval_in_minutes: daytona.auto_archive_interval_in_minutes,
        auto_delete_interval_in_minutes: daytona.auto_delete_interval_in_minutes,
      },
    });
  }

  async getSandboxProvider() {
    return this.request<{
      data: {
        status: 'pending' | 'ready' | 'failed';
        status_reason: string | null;
      };
    }>('GET', '/settings/sandbox-providers');
  }

  async waitForSandboxReady(options?: {
    timeoutMs?: number;
    intervalMs?: number;
  }): Promise<void> {
    const timeoutMs = options?.timeoutMs ?? 60_000;
    const intervalMs = options?.intervalMs ?? 2_000;
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const response = await this.getSandboxProvider();
      const { status, status_reason: reason } = response.data;

      if (status === 'ready') {
        return;
      }
      if (status === 'failed') {
        throw new TrueForgeAdminError(
          reason ?? 'Daytona sandbox provider failed to initialize',
          422,
        );
      }

      await sleep(intervalMs);
    }

    throw new TrueForgeAdminError(
      'Timed out waiting for Daytona sandbox provider to become ready',
      408,
    );
  }

  async listAgents() {
    return this.request<{
      data: Array<{ id: string; name: string }>;
    }>('GET', '/agents');
  }

  async createAgent(input: { name: string; modelFqn: string }) {
    return this.request('POST', '/agents', {
      name: input.name,
      manifest: buildSentinelAgentManifest(input.modelFqn),
    });
  }

  async updateAgent(input: { agentId: string; modelFqn: string }) {
    return this.request('PUT', `/agents/${input.agentId}`, {
      manifest: buildSentinelAgentManifest(input.modelFqn),
    });
  }

  async upsertSentinelAgent(modelFqn: string) {
    const agents = await this.listAgents();
    const existing = agents.data.find((agent) => agent.name === SENTINEL_AGENT_NAME);

    if (existing) {
      await this.updateAgent({ agentId: existing.id, modelFqn });
      return { action: 'updated' as const, name: SENTINEL_AGENT_NAME, id: existing.id };
    }

    try {
      await this.createAgent({ name: SENTINEL_AGENT_NAME, modelFqn });
      const refreshed = await this.listAgents();
      const created = refreshed.data.find((agent) => agent.name === SENTINEL_AGENT_NAME);
      return {
        action: 'created' as const,
        name: SENTINEL_AGENT_NAME,
        id: created?.id,
      };
    } catch (err) {
      if (err instanceof TrueForgeAdminError && err.status === 409) {
        const refreshed = await this.listAgents();
        const found = refreshed.data.find((agent) => agent.name === SENTINEL_AGENT_NAME);
        if (found) {
          await this.updateAgent({ agentId: found.id, modelFqn });
          return { action: 'updated' as const, name: SENTINEL_AGENT_NAME, id: found.id };
        }
      }
      throw err;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseModelFqn(modelFqn: string): {
  providerType: string;
  modelName: string;
} {
  const slash = modelFqn.indexOf('/');
  if (slash <= 0 || slash === modelFqn.length - 1) {
    throw new TrueForgeAdminError(
      `TRUEFORGE_MODEL must be provider/model (e.g. anthropic/claude-sonnet-4-6), got "${modelFqn}"`,
      400,
    );
  }
  return {
    providerType: modelFqn.slice(0, slash),
    modelName: modelFqn.slice(slash + 1),
  };
}

const PROVIDER_API_KEY_ENV: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  'google-gemini': 'GOOGLE_GEMINI_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  together: 'TOGETHER_API_KEY',
  moonshot: 'MOONSHOT_API_KEY',
  alibaba: 'ALIBABA_API_KEY',
  zai: 'ZAI_API_KEY',
};

export function resolveModelApiKey(
  providerType: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const specific = PROVIDER_API_KEY_ENV[providerType];
  if (specific && env[specific]?.trim()) {
    return env[specific]!.trim();
  }
  if (env.MODEL_API_KEY?.trim()) {
    return env.MODEL_API_KEY.trim();
  }
  return undefined;
}
