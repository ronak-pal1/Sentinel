import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export type SavedConfig = {
  url?: string;
  secret?: string;
};

const CONFIG_PATH = join(homedir(), '.sentinel-cli.json');

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export async function loadConfig(): Promise<SavedConfig | null> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as SavedConfig;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveConfig(config: SavedConfig): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

export async function clearConfig(): Promise<boolean> {
  try {
    await unlink(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}
