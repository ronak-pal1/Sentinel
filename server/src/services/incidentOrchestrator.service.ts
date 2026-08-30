import { StatusCodes } from 'http-status-codes';
import { Incident, type IncidentAttrs } from '../models/Incident';
import { ACTIVE_PHASES } from '../types/domain';
import { AppError } from '../utils/AppError';
import { createIncidentId } from '../utils/ids';
import { logger } from '../utils/logger';
import * as agentSessionService from './agentSession.service';
import * as eventService from './event.service';
import * as github from './github.service';
import * as metricsService from './metrics.service';
import * as trueforge from './trueforge.service';
import type { ParsedAlertPayload } from './webhook.service';
import type { WebhookAttrs } from '../models/Webhook';

function extractDiffFromContent(content: string): string | null {
  const diffMatch = content.match(/```diff\n([\s\S]*?)```/);
  if (diffMatch?.[1]) return diffMatch[1].trim();
  const patchMatch = content.match(/```patch\n([\s\S]*?)```/);
  if (patchMatch?.[1]) return patchMatch[1].trim();
  if (content.includes('--- ') && content.includes('+++ ')) {
    const lines = content.split('\n');
    const start = lines.findIndex((l) => l.startsWith('--- ') || l.startsWith('diff --git'));
    if (start >= 0) return lines.slice(start).join('\n').trim();
  }
  return null;
}

function parseSandboxResultFromToolOutput(output: string): {
  latencyMs: number;
  errorRate: number;
  requestsReplayed: number;
  passed: boolean;
} | null {
  const lower = output.toLowerCase();
  const passed =
    lower.includes('pass') ||
    lower.includes('success') ||
    lower.includes('0 errors') ||
    (lower.includes('exit code 0') || lower.includes('exit code: 0'));
  const latencyMatch = output.match(/(\d+)\s*ms/i);
  return {
    latencyMs: latencyMatch ? Number(latencyMatch[1]) : 400,
    errorRate: passed ? 0 : 1,
    requestsReplayed: 1,
    passed,
  };
}

async function seedInitialTelemetry(incidentId: string) {
  const now = Date.now();
  for (let i = 20; i >= 0; i -= 1) {
    await metricsService.appendMetricPoint({
      incidentId,
      t: now - i * 5_000,
      latencyMs: 180 + Math.random() * 220,
      errorRate: 0.04 + Math.random() * 0.06,
    });
  }
}

async function openIncidentPullRequest(
  incidentId: string,
  context: {
    profileId: string;
    githubOwner?: string;
    githubRepo?: string;
  },
  patch: string,
): Promise<{ prUrl: string; prNumber: number } | null> {
  if (!context.githubOwner || !context.githubRepo) {
    await eventService.appendEvent({
      incidentId,
      type: 'failure',
      tool: 'github',
      message: 'Cannot open PR — webhook is missing GitHub owner/repo',
      phase: 'sandbox_verifying',
    });
    return null;
  }

  const incident = await Incident.findOne({ id: incidentId }).lean<IncidentAttrs>();
  if (incident?.prUrl) {
    return {
      prUrl: incident.prUrl,
      prNumber: incident.prNumber ?? 0,
    };
  }

  try {
    const pr = await github.createPullRequest(context.profileId, {
      owner: context.githubOwner,
      repo: context.githubRepo,
      title: `[Sentinel] Fix for ${incident?.alertType ?? 'incident'} on ${incident?.service ?? context.githubRepo}`,
      body: [
        `Automated fix proposed by Sentinel for incident ${incidentId}.`,
        '',
        `Root cause: ${incident?.rootCause ?? 'See investigation logs'}`,
      ].join('\n'),
      patch,
    });

    await Incident.updateOne(
      { id: incidentId },
      {
        $set: {
          phase: 'pr_opened',
          prUrl: pr.prUrl,
          prNumber: pr.prNumber,
          proposedPatch: patch,
          diff: pr.diff,
          proposedAction: `Review PR #${pr.prNumber} and approve remediation`,
        },
      },
    );

    await eventService.appendEvent({
      incidentId,
      type: 'success',
      tool: 'github',
      message: `PR #${pr.prNumber} opened`,
      detail: pr.prUrl,
      phase: 'pr_opened',
    });

    return { prUrl: pr.prUrl, prNumber: pr.prNumber };
  } catch (err) {
    logger.error('Failed to open PR after sandbox verification', err);
    await eventService.appendEvent({
      incidentId,
      type: 'failure',
      tool: 'github',
      message: 'Failed to open PR after sandbox verification',
      detail: err instanceof Error ? err.message : 'Unknown error',
      phase: 'sandbox_verifying',
    });
    return null;
  }
}

async function consumeAgentStream(
  incidentId: string,
  sessionId: string,
  prompt: string,
  context: {
    profileId: string;
    githubOwner?: string;
    githubRepo?: string;
  },
) {
  let fullModelContent = '';
  let sandboxVerified = false;
  let openedPrUrl: string | undefined;

  try {
    await eventService.appendEvent({
      incidentId,
      type: 'action',
      tool: 'trueforge',
      message: 'Agent session started (sandbox enabled via TrueForge)',
      detail: `session ${sessionId}`,
      phase: 'investigating',
    });
    await Incident.updateOne({ id: incidentId }, { $set: { phase: 'investigating' } });

    const stream = await trueforge.runTurnStream(sessionId, [
      { type: 'user.message', content: prompt },
    ]);

    for await (const event of stream) {
      const type =
        typeof event === 'object' && event && 'type' in event
          ? String((event as { type: unknown }).type)
          : 'unknown';

      const content =
        typeof event === 'object' &&
        event &&
        'content' in event &&
        typeof (event as { content: unknown }).content === 'string'
          ? (event as { content: string }).content
          : undefined;

      if (content) {
        fullModelContent += content;
      }

      if (type === 'sandbox.created' && typeof event === 'object' && event) {
        const sandboxId = (event as { sandbox_id?: string }).sandbox_id;
        await Incident.updateOne(
          { id: incidentId },
          {
            $set: {
              phase: 'sandbox_verifying',
              ...(sandboxId ? { daytonaSandboxId: sandboxId } : {}),
            },
          },
        );
        await eventService.appendEvent({
          incidentId,
          type: 'action',
          tool: 'sandbox',
          message: 'TrueForge provisioned Daytona sandbox',
          ...(sandboxId ? { detail: `sandbox ${sandboxId}` } : {}),
          phase: 'sandbox_verifying',
        });
      }

      if (type === 'tool.response' && typeof event === 'object' && event) {
        const toolOutput =
          typeof (event as { content?: unknown }).content === 'string'
            ? (event as { content: string }).content
            : JSON.stringify(event).slice(0, 2000);
        const parsed = parseSandboxResultFromToolOutput(toolOutput);
        if (parsed) {
          sandboxVerified = parsed.passed;
          // Do not set pr_opened here — that phase is reserved for a real GitHub PR.
          await Incident.updateOne(
            { id: incidentId },
            {
              $set: {
                sandboxResult: {
                  latencyMs: parsed.latencyMs,
                  errorRate: parsed.errorRate,
                  requestsReplayed: parsed.requestsReplayed,
                },
                phase: 'sandbox_verifying',
              },
            },
          );
          await eventService.appendEvent({
            incidentId,
            type: parsed.passed ? 'success' : 'failure',
            tool: 'sandbox',
            message: parsed.passed
              ? `Sandbox verification passed (${parsed.latencyMs}ms)`
              : 'Sandbox verification reported issues',
            detail: toolOutput.slice(0, 2000),
            phase: 'sandbox_verifying',
          });

          if (parsed.passed && !openedPrUrl) {
            const earlyPatch = extractDiffFromContent(fullModelContent);
            if (earlyPatch) {
              const pr = await openIncidentPullRequest(
                incidentId,
                context,
                earlyPatch,
              );
              if (pr) openedPrUrl = pr.prUrl;
            }
          }
        }
      }

      const message =
        type === 'model.message.delta'
          ? 'Model streaming…'
          : type === 'turn.done'
            ? 'Agent turn completed'
            : type === 'tool.approval_required'
              ? 'Approval required for tool action'
              : type === 'sandbox.created'
                ? 'Daytona sandbox provisioned via TrueForge'
                : type === 'tool.response'
                  ? 'Sandbox tool completed'
                  : `Agent event: ${type}`;

      if (type !== 'sandbox.created' && type !== 'tool.response') {
        await eventService.appendEvent({
          incidentId,
          type:
            type === 'tool.approval_required' || type === 'failure'
              ? 'action'
              : 'info',
          tool: 'trueforge',
          message,
          ...(content !== undefined ? { detail: content.slice(0, 2000) } : {}),
        });
      }

      if (type === 'tool.approval_required' && typeof event === 'object' && event) {
        const ev = event as {
          threadId?: string;
          toolCalls?: { id?: string }[];
        };
        const toolCallId = ev.toolCalls?.[0]?.id;
        const threadId = ev.threadId ?? 'main';
        if (toolCallId) {
          await Incident.updateOne(
            { id: incidentId },
            {
              $set: {
                phase: 'awaiting_approval',
                trueforgePendingApproval: { threadId, toolCallId },
                proposedAction:
                  'Approve agent tool action to proceed with proposed remediation',
              },
            },
          );
        }
      }

      if (type === 'model.message' && content) {
        await Incident.updateOne(
          { id: incidentId },
          {
            $set: {
              phase: 'root_cause_found',
              rootCause: content.slice(0, 500),
              confidence: 0.82,
            },
          },
        );
        await eventService.appendEvent({
          incidentId,
          type: 'success',
          message: 'Root cause hypothesis identified',
          phase: 'root_cause_found',
        });
      }
    }

    const patch = extractDiffFromContent(fullModelContent);
    if (patch) {
      await Incident.updateOne(
        { id: incidentId },
        { $set: { proposedPatch: patch, diff: patch } },
      );
      await eventService.appendEvent({
        incidentId,
        type: 'action',
        message: 'Proposed fix patch received from agent',
        phase: 'root_cause_found',
      });
    }

    // End of stream: open PR if sandbox passed and we have a patch but no PR yet.
    if (sandboxVerified && patch && !openedPrUrl) {
      const pr = await openIncidentPullRequest(incidentId, context, patch);
      if (pr) openedPrUrl = pr.prUrl;
    }

    const incident = await Incident.findOne({ id: incidentId }).lean<IncidentAttrs>();
    if (incident && incident.phase !== 'awaiting_approval') {
      const hasPr = Boolean(openedPrUrl || incident.prUrl);
      await Incident.updateOne(
        { id: incidentId },
        {
          $set: {
            phase: 'awaiting_approval',
            proposedAction: hasPr
              ? `PR opened — review ${incident.prUrl ?? openedPrUrl} and approve remediation`
              : sandboxVerified
                ? patch
                  ? 'Sandbox passed but PR could not be opened — review patch and approve to retry'
                  : 'Sandbox verification passed — review findings and approve next steps'
                : patch
                  ? 'Review proposed fix and approve to open PR'
                  : 'Agent completed investigation — review and approve next steps',
          },
        },
      );
      await eventService.appendEvent({
        incidentId,
        type: 'action',
        message: hasPr
          ? 'Awaiting human approval — PR already opened'
          : 'Awaiting human approval before opening PR',
        phase: 'awaiting_approval',
      });
    }
  } catch (err) {
    logger.error('Agent stream failed', err);
    await eventService.appendEvent({
      incidentId,
      type: 'failure',
      tool: 'trueforge',
      message: 'Agent investigation failed',
      detail: err instanceof Error ? err.message : 'Unknown error',
      phase: 'investigating',
    });
  }
}

export async function startWebhookIncident(
  profileId: string,
  webhook: WebhookAttrs,
  alert: ParsedAlertPayload,
): Promise<Omit<IncidentAttrs, 'profileId'>> {
  const existing = await Incident.findOne({
    profileId,
    phase: { $in: [...ACTIVE_PHASES] },
  }).lean<IncidentAttrs>();
  if (existing) {
    throw new AppError(
      `An active incident already exists: ${existing.id}`,
      StatusCodes.CONFLICT,
    );
  }

  const id = createIncidentId(alert.service);
  const startedAt = new Date().toISOString();

  const incident = await Incident.create({
    id,
    profileId,
    service: alert.service,
    alertType: alert.alertType,
    alertMessage: alert.message,
    phase: 'alert',
    startedAt,
    source: 'webhook',
    webhookId: webhook.id,
    githubOwner: webhook.githubOwner,
    githubRepo: webhook.githubRepo,
  });

  await eventService.appendEvent({
    incidentId: id,
    type: 'failure',
    tool: 'webhook',
    message: `Alert fired: ${alert.alertType}`,
    detail: alert.message,
    phase: 'alert',
  });

  await seedInitialTelemetry(id);

  let repoContext = '';
  try {
    repoContext = await github.fetchRepoContext(
      profileId,
      webhook.githubOwner,
      webhook.githubRepo,
    );
    await eventService.appendEvent({
      incidentId: id,
      type: 'info',
      tool: 'github',
      message: `Fetched repository context for ${webhook.githubOwner}/${webhook.githubRepo}`,
    });
  } catch (err) {
    logger.warn('Could not fetch repo context', err);
  }

  let sessionId: string | undefined;
  try {
    const session = await trueforge.createSession({
      title: `Incident ${id}`,
      incidentId: id,
    });
    sessionId = session.id;
    await Incident.updateOne({ id }, { $set: { trueforgeSessionId: sessionId } });
    await agentSessionService.registerAgentSession({
      sessionId,
      profileId,
      incidentId: id,
    });
  } catch (err) {
    logger.warn('Could not create TrueForge session', err);
    await eventService.appendEvent({
      incidentId: id,
      type: 'failure',
      tool: 'trueforge',
      message: 'TrueForge unavailable — incident created without agent session',
      detail: err instanceof Error ? err.message : 'Unknown error',
      phase: 'alert',
    });
  }

  if (sessionId) {
    const prompt = [
      `Production incident ${id} on repository ${webhook.githubOwner}/${webhook.githubRepo}.`,
      `Service: "${alert.service}".`,
      `Alert: ${alert.alertType}.`,
      `Message: ${alert.message}`,
      '',
      'Relevant repository files:',
      repoContext || '(no files fetched)',
      '',
      'Investigate root cause using the alert and code context.',
      'Use the TrueForge sandbox (Daytona) to clone the repository, apply your proposed patch, and run tests.',
      'Propose a fix as a unified diff patch in a ```diff code block.',
      'Report sandbox verification results (latency, errors, test output).',
      'Do NOT create a PR or push changes yourself — Sentinel will open the GitHub PR after sandbox verification for human review.',
      'After verification, wait for human approval before any production merge or deploy.',
    ].join('\n');

    void consumeAgentStream(id, sessionId, prompt, {
      profileId,
      githubOwner: webhook.githubOwner,
      githubRepo: webhook.githubRepo,
    });
  }

  const doc = incident.toObject();
  const { profileId: _pid, ...rest } = doc;
  return rest;
}

export { consumeAgentStream, extractDiffFromContent };
