import { randomBytes } from 'crypto';

export function shortId(bytes = 3): string {
  return randomBytes(bytes).toString('hex');
}

export function createIncidentId(service: string): string {
  const slug = service
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return `inc-${slug || 'service'}-${shortId()}`;
}

export function createEventId(): string {
  return `evt-${shortId(4)}`;
}
