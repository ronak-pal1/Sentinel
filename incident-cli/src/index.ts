#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import {
  buildPayload,
  getScenario,
  listScenarios,
  scenarioIdFromSlug,
  type PayloadFormat,
  type ScenarioFields,
  type ScenarioId,
} from './scenarios.js';
import {
  clearSavedConfig,
  persistIfRequested,
  runInteractiveFlow,
} from './prompts.js';
import { triggerWebhook, validateWebhookUrl } from './trigger.js';
import {
  printBanner,
  printError,
  printScenariosTable,
  printSuccess,
} from './ui.js';

type FireOptions = {
  url?: string;
  secret?: string;
  scenario?: string;
  format?: PayloadFormat;
  service?: string;
  alertType?: string;
  message?: string;
  severity?: string;
};

async function executeFire(input: {
  url: string;
  secret: string;
  format: PayloadFormat;
  fields: ScenarioFields;
  remember?: boolean;
}): Promise<number> {
  const payload = buildPayload(input.format, input.fields);
  const spinner = ora({
    text: 'Firing webhook…',
    color: 'yellow',
  }).start();

  const result = await triggerWebhook(input.url, input.secret, payload);
  spinner.stop();

  if (result.ok) {
    printSuccess(result);
    if (input.remember) {
      await persistIfRequested({
        url: input.url,
        secret: input.secret,
        format: input.format,
        fields: input.fields,
        remember: true,
      });
    }
    return 0;
  }

  printError(result);
  return 1;
}

function resolveFieldsFromFlags(options: FireOptions): ScenarioFields | null {
  if (options.scenario && options.scenario !== 'custom') {
    const id = scenarioIdFromSlug(options.scenario);
    if (!id) return null;
    const preset = getScenario(id);
    if (!preset) return null;
    return { ...preset.fields };
  }

  if (
    options.service &&
    options.alertType &&
    options.message
  ) {
    return {
      service: options.service,
      alertType: options.alertType,
      message: options.message,
      severity: options.severity ?? 'critical',
    };
  }

  return null;
}

async function runFireCommand(options: FireOptions): Promise<number> {
  const hasFlags = Boolean(options.url && options.secret && options.scenario);

  if (!hasFlags) {
    try {
      const input = await runInteractiveFlow();
      return executeFire({
        url: input.url,
        secret: input.secret,
        format: input.format,
        fields: input.fields,
        remember: input.remember,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'Cancelled') {
        console.log('Cancelled.');
        return 0;
      }
      throw err;
    }
  }

  const url = options.url!.trim();
  const secret = options.secret!.trim();
  const urlError = validateWebhookUrl(url);
  if (urlError) {
    printError({ ok: false, status: 0, message: urlError });
    return 1;
  }

  const scenarioId = scenarioIdFromSlug(options.scenario!);
  if (!scenarioId) {
    printError({
      ok: false,
      status: 0,
      message: `Unknown scenario "${options.scenario}". Run "sentinel-trigger scenarios" to list options.`,
    });
    return 1;
  }

  let fields: ScenarioFields | null = resolveFieldsFromFlags({
    ...options,
    scenario: scenarioId,
  });

  if (!fields && scenarioId !== 'custom') {
    const preset = getScenario(scenarioId as Exclude<ScenarioId, 'custom'>);
    fields = preset ? { ...preset.fields } : null;
  }

  if (!fields) {
    printError({
      ok: false,
      status: 0,
      message:
        'Custom scenario requires --service, --alert-type, and --message flags.',
    });
    return 1;
  }

  const format: PayloadFormat = options.format ?? 'generic';
  return executeFire({ url, secret, format, fields });
}

const program = new Command();

program
  .name('sentinel-trigger')
  .description('Trigger Sentinel webhook incidents for hackathon demos')
  .version('1.0.0');

program
  .command('fire', { isDefault: true })
  .description('Fire a webhook incident (interactive by default)')
  .option('--url <url>', 'Webhook URL from Sentinel')
  .option('--secret <secret>', 'X-Sentinel-Secret value')
  .option(
    '--scenario <id>',
    'Scenario: latency | error-rate | memory-leak | db-pool | custom',
  )
  .option('--format <format>', 'Payload format: generic | grafana', 'generic')
  .option('--service <name>', 'Custom service name')
  .option('--alert-type <type>', 'Custom alert type')
  .option('--message <text>', 'Custom alert message')
  .option('--severity <level>', 'Custom severity', 'critical')
  .action(async (options: FireOptions) => {
    const code = await runFireCommand(options);
    process.exit(code);
  });

program
  .command('scenarios')
  .description('List available incident scenarios')
  .action(() => {
    printScenariosTable(
      listScenarios().map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
      })),
    );
  });

const configCmd = program.command('config').description('Manage saved config');

configCmd
  .command('clear')
  .description('Clear saved webhook URL and secret')
  .action(async () => {
    printBanner();
    await clearSavedConfig();
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error('Unexpected error');
  }
  process.exit(1);
});
