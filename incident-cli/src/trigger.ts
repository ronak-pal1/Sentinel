import type { WebhookPayload } from './scenarios.js';

export type TriggerResult =
  | {
      ok: true;
      status: number;
      incidentId: string;
      phase: string;
      service?: string;
      alertType?: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
      hint?: string;
    };

const WEBHOOK_URL_RE = /\/api\/hooks\/(wh-[a-f0-9]+)/i;

export function parseWebhookUrl(url: string): { webhookId: string } | null {
  const match = url.match(WEBHOOK_URL_RE);
  if (!match?.[1]) return null;
  return { webhookId: match[1] };
}

export function validateWebhookUrl(url: string): string | null {
  try {
    new URL(url);
  } catch {
    return 'Invalid URL — enter the full webhook URL from Sentinel';
  }
  if (!parseWebhookUrl(url)) {
    return 'URL must contain /api/hooks/wh-… (copy from Sentinel Webhooks page)';
  }
  return null;
}

type ApiSuccess = {
  success: true;
  data: { incidentId: string; phase: string };
};

type ApiError = {
  success?: false;
  message?: string;
};

function errorHint(status: number, message: string): string | undefined {
  if (status === 401) {
    return 'Re-copy X-Sentinel-Secret from the Webhooks page (shown once at creation).';
  }
  if (status === 409) {
    return 'Resolve or dismiss the active incident in Sentinel before firing another alert.';
  }
  if (status === 410) {
    return 'Re-enable the webhook in Sentinel or create a new one.';
  }
  if (status === 404) {
    return 'Check the webhook URL — the webhook may have been deleted.';
  }
  if (status === 429) {
    return 'Rate limited — wait a moment and try again.';
  }
  if (message.toLowerCase().includes('fetch')) {
    return 'Is the Sentinel server running? Default: http://localhost:3000';
  }
  return undefined;
}

export async function triggerWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload,
): Promise<TriggerResult> {
  const urlError = validateWebhookUrl(url);
  if (urlError) {
    return { ok: false, status: 0, message: urlError };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentinel-Secret': secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Network request failed';
    return {
      ok: false,
      status: 0,
      message,
      hint: errorHint(0, message),
    };
  }

  let body: ApiSuccess | ApiError = {};
  try {
    body = (await response.json()) as ApiSuccess | ApiError;
  } catch {
    // non-JSON body
  }

  if (response.ok && body.success === true && 'data' in body) {
    let service: string | undefined;
    let alertType: string | undefined;

    if ('service' in payload) {
      service = payload.service;
      alertType = payload.alertType;
    } else if ('alerts' in payload && payload.alerts[0]) {
      service = payload.alerts[0].labels.service;
      alertType = payload.alerts[0].labels.alertname;
    }

    return {
      ok: true,
      status: response.status,
      incidentId: body.data.incidentId,
      phase: body.data.phase,
      ...(service ? { service } : {}),
      ...(alertType ? { alertType } : {}),
    };
  }

  const message =
    ('message' in body && body.message) ||
    (response.status === 404
      ? 'Webhook not found'
      : `Request failed with status ${response.status}`);

  return {
    ok: false,
    status: response.status,
    message,
    hint: errorHint(response.status, message),
  };
}
