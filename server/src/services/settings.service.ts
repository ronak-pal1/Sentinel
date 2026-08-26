import { StatusCodes } from 'http-status-codes';
import {
  DEFAULT_CONNECTORS,
  DEFAULT_SANDBOX_LIMITS,
  Settings,
  type SettingsAttrs,
} from '../models/Settings';
import { decryptSecret, encryptSecret, maskApiKey } from '../utils/crypto';
import { AppError } from '../utils/AppError';
import * as trueforge from './trueforge.service';

export type PublicSettings = {
  connectors: { name: string; status: string; detail: string }[];
  sandboxLimits: {
    maxReplay: number;
    timeoutSec: number;
    isolation: string;
    network: string;
  };
  hasApiKey: boolean;
  modelApiKeyMasked: string | null;
};

async function ensureSettings() {
  let doc = await Settings.findOne({ key: 'default' });
  if (!doc) {
    doc = await Settings.create({
      key: 'default',
      connectors: [...DEFAULT_CONNECTORS],
      sandboxLimits: { ...DEFAULT_SANDBOX_LIMITS },
    });
  }
  return doc;
}

function toPublic(doc: SettingsAttrs): PublicSettings {
  const encrypted = doc.modelApiKeyEncrypted;
  let masked: string | null = null;
  if (encrypted) {
    try {
      masked = maskApiKey(decryptSecret(encrypted));
    } catch {
      masked = '••••••••';
    }
  }

  return {
    connectors: doc.connectors.map((c) => ({
      name: c.name,
      status: c.status,
      detail: c.detail,
    })),
    sandboxLimits: {
      maxReplay: doc.sandboxLimits.maxReplay,
      timeoutSec: doc.sandboxLimits.timeoutSec,
      isolation: doc.sandboxLimits.isolation,
      network: doc.sandboxLimits.network,
    },
    hasApiKey: Boolean(encrypted),
    modelApiKeyMasked: masked,
  };
}

export async function getSettings(): Promise<PublicSettings> {
  const doc = await ensureSettings();
  return toPublic(doc.toObject());
}

export async function updateSettings(input: {
  modelApiKey?: string;
  clearModelApiKey?: boolean;
  sandboxLimits?: {
    maxReplay?: number;
    timeoutSec?: number;
    isolation?: string;
    network?: string;
  };
}): Promise<PublicSettings> {
  const doc = await ensureSettings();

  if (input.clearModelApiKey) {
    doc.set('modelApiKeyEncrypted', undefined);
    doc.markModified('modelApiKeyEncrypted');
  } else if (input.modelApiKey) {
    doc.modelApiKeyEncrypted = encryptSecret(input.modelApiKey);
  }

  if (input.sandboxLimits) {
    if (input.sandboxLimits.maxReplay !== undefined) {
      doc.sandboxLimits.maxReplay = input.sandboxLimits.maxReplay;
    }
    if (input.sandboxLimits.timeoutSec !== undefined) {
      doc.sandboxLimits.timeoutSec = input.sandboxLimits.timeoutSec;
    }
    if (input.sandboxLimits.isolation !== undefined) {
      doc.sandboxLimits.isolation = input.sandboxLimits.isolation;
    }
    if (input.sandboxLimits.network !== undefined) {
      doc.sandboxLimits.network = input.sandboxLimits.network;
    }
  }

  await doc.save();
  return toPublic(doc.toObject());
}

export async function listConnectors() {
  const settings = await getSettings();
  return settings.connectors;
}

export async function testConnector(name: string) {
  const settings = await getSettings();
  const connector = settings.connectors.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );

  const lower = name.toLowerCase();
  if (!connector && lower !== 'trueforge' && lower !== 'agent') {
    throw new AppError(`Connector not found: ${name}`, StatusCodes.NOT_FOUND);
  }

  if (
    lower === 'trueforge' ||
    lower === 'agent' ||
    connector?.name.toLowerCase().includes('sandbox')
  ) {
    const health = await trueforge.healthCheck();
    return {
      name: connector?.name ?? name,
      ok: health.ok,
      message: health.message,
      detail: connector?.detail,
    };
  }

  return {
    name: connector!.name,
    ok: connector!.status.toLowerCase() === 'connected',
    message: connector!.status,
    detail: connector!.detail,
  };
}
