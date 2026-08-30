import {
  confirm,
  input,
  password,
  select,
} from '@inquirer/prompts';
import chalk from 'chalk';
import {
  buildPayload,
  getScenario,
  listScenarios,
  type PayloadFormat,
  type ScenarioFields,
  type ScenarioId,
} from './scenarios.js';
import { clearConfig, loadConfig, saveConfig } from './config.js';
import { validateWebhookUrl } from './trigger.js';
import { printBanner, printSummaryBox } from './ui.js';

export type FireInput = {
  url: string;
  secret: string;
  format: PayloadFormat;
  fields: ScenarioFields;
  remember: boolean;
};

export async function runInteractiveFlow(): Promise<FireInput> {
  printBanner();

  const saved = await loadConfig();
  let url = saved?.url ?? '';
  let secret = saved?.secret ?? '';

  if (saved?.url && saved?.secret) {
    const reuse = await confirm({
      message: `Use saved webhook config? (${chalk.hex('#6B655B')(saved.url)})`,
      default: true,
    });
    if (!reuse) {
      url = '';
      secret = '';
    }
  }

  if (!url) {
    url = await input({
      message: 'Webhook URL',
      validate: (value) => validateWebhookUrl(value.trim()) ?? true,
    });
    url = url.trim();
  }

  if (!secret) {
    secret = await password({
      message: 'X-Sentinel-Secret',
      mask: '•',
      validate: (value) =>
        value.trim().length > 0 || 'Secret is required',
    });
    secret = secret.trim();
  }

  const format = await select<PayloadFormat>({
    message: 'Payload format',
    choices: [
      {
        name: 'Generic — simple JSON (recommended)',
        value: 'generic',
        description: 'Matches README curl example',
      },
      {
        name: 'Grafana-style — alerts[] array',
        value: 'grafana',
        description: 'Simulates Grafana unified alerting webhook',
      },
    ],
  });

  const scenarioChoice = await select<ScenarioId>({
    message: 'Incident scenario',
    choices: [
      ...listScenarios().map((s) => ({
        name: s.name,
        value: s.id as ScenarioId,
        description: s.description,
      })),
      {
        name: 'Custom — enter your own fields',
        value: 'custom' as ScenarioId,
      },
    ],
  });

  let fields: ScenarioFields;

  if (scenarioChoice === 'custom') {
    fields = {
      service: (
        await input({
          message: 'Service name',
          default: 'checkout-svc',
          validate: (v) => v.trim().length > 0 || 'Required',
        })
      ).trim(),
      alertType: (
        await input({
          message: 'Alert type',
          default: 'HighErrorRate',
          validate: (v) => v.trim().length > 0 || 'Required',
        })
      ).trim(),
      message: (
        await input({
          message: 'Alert message',
          default: 'p99 latency exceeded 2s',
          validate: (v) => v.trim().length > 0 || 'Required',
        })
      ).trim(),
      severity: (
        await select({
          message: 'Severity',
          choices: [
            { name: 'critical', value: 'critical' },
            { name: 'warning', value: 'warning' },
            { name: 'info', value: 'info' },
          ],
        })
      ) as string,
    };
  } else {
    const preset = getScenario(scenarioChoice);
    if (!preset) {
      throw new Error(`Unknown scenario: ${scenarioChoice}`);
    }
    fields = { ...preset.fields };
  }

  printSummaryBox({ url, format, fields });

  const proceed = await confirm({
    message: 'Fire webhook now?',
    default: true,
  });
  if (!proceed) {
    throw new Error('Cancelled');
  }

  const remember =
    !saved?.url || !saved?.secret
      ? await confirm({
          message: 'Remember URL and secret for next run?',
          default: true,
        })
      : false;

  return { url, secret, format, fields, remember };
}

export async function persistIfRequested(input: FireInput): Promise<void> {
  if (input.remember) {
    await saveConfig({ url: input.url, secret: input.secret });
  }
}

export async function clearSavedConfig(): Promise<void> {
  const cleared = await clearConfig();
  if (cleared) {
    console.log(chalk.hex('#EEB355')('Saved config cleared.'));
  } else {
    console.log(chalk.hex('#6B655B')('No saved config found.'));
  }
}

export { buildPayload };
