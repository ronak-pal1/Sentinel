import { StatusCodes } from 'http-status-codes';
import {
  DEFAULT_CONNECTORS,
  DEFAULT_SANDBOX_LIMITS,
  Settings,
  type SettingsAttrs,
} from '../models/Settings';
import { decryptSecret, encryptSecret, maskApiKey } from '../utils/crypto';
import { AppError } from '../utils/AppError';
import * as github from './github.service';
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
  githubConnected: boolean;
  githubUsername: string | null;
};

async function ensureSettings(profileId: string) {
  let doc = await Settings.findOne({ profileId });
  if (!doc) {
    doc = await Settings.create({
      profileId,
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
    githubConnected: Boolean(doc.githubTokenEncrypted),
    githubUsername: doc.githubUsername ?? null,
  };
}

export async function getSettings(profileId: string): Promise<PublicSettings> {
  const doc = await ensureSettings(profileId);
  return toPublic(doc.toObject());
}

export async function updateSettings(
  profileId: string,
  input: {
    modelApiKey?: string;
    clearModelApiKey?: boolean;
    sandboxLimits?: {
      maxReplay?: number;
      timeoutSec?: number;
      isolation?: string;
      network?: string;
    };
  },
): Promise<PublicSettings> {
  const doc = await ensureSettings(profileId);

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

export async function listConnectors(profileId: string) {
  const settings = await getSettings(profileId);
  return settings.connectors;
}

export async function testConnector(profileId: string, name: string) {
  const settings = await getSettings(profileId);
  const connector = settings.connectors.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );

  const lower = name.toLowerCase();
  if (!connector && lower !== 'trueforge' && lower !== 'agent') {
    throw new AppError(`Connector not found: ${name}`, StatusCodes.NOT_FOUND);
  }

  if (
    lower === 'trueforge' ||
    lower === 'agent'
  ) {
    const health = await trueforge.healthCheck();
    return {
      name: connector?.name ?? name,
      ok: health.ok,
      message: health.message,
      detail: connector?.detail,
    };
  }

  if (lower === 'github' || connector?.name.toLowerCase().includes('github')) {
    const result = await github.testConnection(profileId);
    return {
      name: connector?.name ?? 'GitHub',
      ok: result.ok,
      message: result.message,
      detail: connector?.detail,
    };
  }

  if (connector?.name.toLowerCase().includes('sandbox')) {
    const health = await trueforge.sandboxHealthCheck();
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
