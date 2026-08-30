import type { Model } from 'mongoose';
import type { ProfileCredentials } from './apiClient.js';

export type SeedIncidentOptions = {
  profileId: string;
  phase?: string;
  service?: string;
  alertType?: string;
  proposedAction?: string;
};

async function getIncidentModel(): Promise<Model<Record<string, unknown>>> {
  const mongoose = (await import('mongoose')).default;
  const model = mongoose.models.Incident;
  if (!model) {
    throw new Error(
      'Incident model not registered — ensure acquireTestApp() ran first',
    );
  }
  return model as Model<Record<string, unknown>>;
}

export async function seedIncidentAtPhase(
  options: SeedIncidentOptions,
): Promise<{ id: string; phase: string }> {
  const Incident = await getIncidentModel();
  const { createIncidentId } = await import('../../server/src/utils/ids.js');

  const service = options.service ?? 'checkout-svc';
  const id = createIncidentId(service);
  const startedAt = new Date().toISOString();
  const phase = options.phase ?? 'awaiting_approval';

  await Incident.create({
    id,
    profileId: options.profileId,
    service,
    alertType: options.alertType ?? 'p99 latency spike',
    phase,
    startedAt,
    source: 'demo',
    ...(options.proposedAction !== undefined
      ? { proposedAction: options.proposedAction }
      : {}),
  });

  return { id, phase };
}

export async function seedIncidentForProfile(
  creds: ProfileCredentials,
  phase = 'awaiting_approval',
): Promise<{ id: string; phase: string }> {
  return seedIncidentAtPhase({
    profileId: creds.id,
    phase,
  });
}
