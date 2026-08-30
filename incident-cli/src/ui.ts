import boxen from 'boxen';
import chalk from 'chalk';
import type { ScenarioFields } from './scenarios.js';
import type { TriggerResult } from './trigger.js';

const gold = chalk.hex('#EEB355');
const muted = chalk.hex('#6B655B');
const success = chalk.hex('#3D6B4F');
const danger = chalk.hex('#C0392B');

export function printBanner(): void {
  const innerWidth = 40;
  const pad = (text: string) => {
    const visible = text.replace(/\u001b\[[0-9;]*m/g, '').length;
    const left = Math.max(0, Math.floor((innerWidth - visible) / 2));
    const right = Math.max(0, innerWidth - visible - left);
    return ' '.repeat(left) + text + ' '.repeat(right);
  };

  console.log('');
  console.log(gold('  ╔══════════════════════════════════════════╗'));
  console.log(gold('  ║') + pad(gold.bold('SENTINEL  INCIDENT  TRIGGER')) + gold('║'));
  console.log(gold('  ║') + pad(muted('Simulate Grafana / PagerDuty alerts')) + gold('║'));
  console.log(gold('  ╚══════════════════════════════════════════╝'));
  console.log('');
}

export function printScenariosTable(
  rows: Array<{ id: string; name: string; description: string }>,
): void {
  printBanner();
  console.log(gold.bold('Available scenarios\n'));
  for (const row of rows) {
    console.log(`  ${gold(row.id.padEnd(14))} ${chalk.white(row.name)}`);
    console.log(`  ${''.padEnd(14)} ${muted(row.description)}`);
    console.log('');
  }
}

export function printSummaryBox(input: {
  url: string;
  format: string;
  fields: ScenarioFields;
}): void {
  const lines = [
    `${muted('Target')}     ${chalk.white(input.url)}`,
    `${muted('Format')}     ${chalk.white(input.format)}`,
    `${muted('Service')}    ${chalk.white(input.fields.service)}`,
    `${muted('Alert')}      ${chalk.white(input.fields.alertType)}`,
    `${muted('Message')}    ${chalk.white(input.fields.message)}`,
    `${muted('Severity')}   ${chalk.white(input.fields.severity)}`,
  ];

  console.log(
    boxen(lines.join('\n'), {
      title: gold('Ready to fire'),
      titleAlignment: 'center',
      padding: 1,
      borderColor: '#EEB355',
      borderStyle: 'round',
    }),
  );
  console.log('');
}

export function printSuccess(result: TriggerResult & { ok: true }): void {
  const lines = [
    `${muted('incidentId')}   ${success.bold(result.incidentId)}`,
    `${muted('phase')}        ${chalk.white(result.phase)}`,
    ...(result.service
      ? [`${muted('service')}       ${chalk.white(result.service)}`]
      : []),
    ...(result.alertType
      ? [`${muted('alertType')}     ${chalk.white(result.alertType)}`]
      : []),
    '',
    muted('Open Sentinel → Incidents to watch the investigation'),
  ];

  console.log(
    boxen(lines.join('\n'), {
      title: success.bold('INCIDENT CREATED'),
      titleAlignment: 'center',
      padding: 1,
      borderColor: '#3D6B4F',
      borderStyle: 'round',
    }),
  );
  console.log('');
}

export function printError(result: TriggerResult & { ok: false }): void {
  const statusLabel =
    result.status > 0 ? `HTTP ${result.status}` : 'Error';
  const lines = [
    `${muted('Status')}     ${danger(statusLabel)}`,
    `${muted('Message')}    ${chalk.white(result.message)}`,
    ...(result.hint ? ['', muted(result.hint)] : []),
  ];

  console.log(
    boxen(lines.join('\n'), {
      title: danger.bold('TRIGGER FAILED'),
      titleAlignment: 'center',
      padding: 1,
      borderColor: '#C0392B',
      borderStyle: 'round',
    }),
  );
  console.log('');
}

export function printInfo(message: string): void {
  console.log(muted(message));
}

export function printDone(message: string): void {
  console.log(gold(message));
}
