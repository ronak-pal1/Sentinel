import { StatusCodes } from 'http-status-codes';
import { Incident, type IncidentAttrs } from '../models/Incident';
import { ACTIVE_PHASES, TERMINAL_PHASES, type IncidentPhase } from '../types/domain';
import { AppError } from '../utils/AppError';
import { createIncidentId } from '../utils/ids';
import { logger } from '../utils/logger';
import * as eventService from './event.service';
import * as metricsService from './metrics.service';
import * as agentSessionService from './agentSession.service';
import * as github from './github.service';
import * as trueforge from './trueforge.service';

function toPublicIncident(incident: IncidentAttrs): Omit<IncidentAttrs, 'profileId'> {
  return {
    id: incident.id,
    service: incident.service,
    alertType: incident.alertType,
    phase: incident.phase,
    startedAt: incident.startedAt,
    ...(incident.resolvedAt !== undefined ? { resolvedAt: incident.resolvedAt } : {}),
    ...(incident.rootCause !== undefined ? { rootCause: incident.rootCause } : {}),
    ...(incident.confidence !== undefined ? { confidence: incident.confidence } : {}),
    ...(incident.sandboxResult !== undefined
      ? { sandboxResult: incident.sandboxResult }
      : {}),
    ...(incident.prUrl !== undefined ? { prUrl: incident.prUrl } : {}),
    ...(incident.prNumber !== undefined ? { prNumber: incident.prNumber } : {}),
    ...(incident.diff !== undefined ? { diff: incident.diff } : {}),
    ...(incident.qodoComments !== undefined
      ? { qodoComments: incident.qodoComments }
      : {}),
    ...(incident.approvedBy !== undefined ? { approvedBy: incident.approvedBy } : {}),
    ...(incident.approvedAt !== undefined ? { approvedAt: incident.approvedAt } : {}),
    ...(incident.resolvedBy !== undefined ? { resolvedBy: incident.resolvedBy } : {}),
    ...(incident.proposedAction !== undefined
      ? { proposedAction: incident.proposedAction }
      : {}),
    ...(incident.trueforgeSessionId !== undefined
      ? { trueforgeSessionId: incident.trueforgeSessionId }
      : {}),
    ...(incident.trueforgePendingApproval !== undefined
      ? { trueforgePendingApproval: incident.trueforgePendingApproval }
      : {}),
    ...(incident.source !== undefined ? { source: incident.source } : {}),
    ...(incident.webhookId !== undefined ? { webhookId: incident.webhookId } : {}),
    ...(incident.githubOwner !== undefined
      ? { githubOwner: incident.githubOwner }
      : {}),
    ...(incident.githubRepo !== undefined ? { githubRepo: incident.githubRepo } : {}),
    ...(incident.alertMessage !== undefined
      ? { alertMessage: incident.alertMessage }
      : {}),
    ...(incident.proposedPatch !== undefined
      ? { proposedPatch: incident.proposedPatch }
      : {}),
  };
}

async function getIncidentOrThrow(
  id: string,
  profileId: string,
): Promise<IncidentAttrs> {
  const incident = await Incident.findOne({ id, profileId }).lean<IncidentAttrs>();
  if (!incident) {
    throw new AppError(`Incident not found: ${id}`, StatusCodes.NOT_FOUND);
  }
  return incident;
}

export async function listIncidents(
  profileId: string,
  filters: {
  active?: boolean;
  phase?: IncidentPhase;
}): Promise<Omit<IncidentAttrs, 'profileId'>[]> {
  const query: Record<string, unknown> = { profileId };
  if (filters.phase) {
    query.phase = filters.phase;
  } else if (filters.active === true) {
    query.phase = { $in: [...ACTIVE_PHASES] };
  } else if (filters.active === false) {
    query.phase = { $in: [...TERMINAL_PHASES] };
  }

  const incidents = await Incident.find(query)
    .sort({ startedAt: -1 })
    .lean<IncidentAttrs[]>();
  return incidents.map(toPublicIncident);
}

export async function getIncident(
  id: string,
  profileId: string,
): Promise<Omit<IncidentAttrs, 'profileId'>> {
  return toPublicIncident(await getIncidentOrThrow(id, profileId));
}

async function seedInitialTelemetry(incidentId: string, degraded: boolean) {
  const now = Date.now();
  for (let i = 20; i >= 0; i -= 1) {
    await metricsService.appendMetricPoint({
      incidentId,
      t: now - i * 5_000,
      latencyMs: degraded ? 180 + Math.random() * 220 : 30 + Math.random() * 20,
      errorRate: degraded
        ? 0.04 + Math.random() * 0.06
        : 0.001 + Math.random() * 0.002,
    });
  }
}

function mapEventToPhase(
  eventType: string,
  current: IncidentPhase,
): IncidentPhase | null {
  if (TERMINAL_PHASES.has(current)) return null;
  if (eventType === 'turn.created' && current === 'alert') return 'investigating';
  if (eventType === 'tool.approval_required') return 'awaiting_approval';
  if (eventType === 'sandbox.created' && current !== 'awaiting_approval') {
    return 'sandbox_verifying';
  }
  if (eventType === 'model.message' && current === 'investigating') {
    return 'root_cause_found';
  }
  return null;
}

async function consumeAgentStream(
  incidentId: string,
  sessionId: string,
  prompt: string,
) {
  try {
    await eventService.appendEvent({
      incidentId,
      type: 'action',
      tool: 'trueforge',
      message: 'Agent session started',
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
          ? (event as { content: string }).content.slice(0, 2000)
          : undefined;

      const message =
        type === 'model.message.delta'
          ? 'Model streaming…'
          : type === 'turn.done'
            ? 'Agent turn completed'
            : type === 'tool.approval_required'
              ? 'Approval required for tool action'
              : type === 'sandbox.created'
                ? 'Daytona sandbox provisioned via TrueForge'
                : `Agent event: ${type}`;

      await eventService.appendEvent({
        incidentId,
        type: type === 'tool.approval_required' ? 'action' : 'info',
        tool: 'trueforge',
        message,
        ...(content !== undefined ? { detail: content } : {}),
      });

      if (type === 'sandbox.created' && typeof event === 'object' && event) {
        const sandboxId = (event as { sandbox_id?: string }).sandbox_id;
        if (sandboxId) {
          await Incident.updateOne(
            { id: incidentId },
            { $set: { daytonaSandboxId: sandboxId } },
          );
        }
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

      const incident = await Incident.findOne({ id: incidentId }).lean<IncidentAttrs>();
      if (incident) {
        const next = mapEventToPhase(type, incident.phase);
        if (next && next !== incident.phase) {
          const updates: Partial<IncidentAttrs> = { phase: next };
          if (next === 'root_cause_found' && content) {
            updates.rootCause = content.slice(0, 500);
            updates.confidence = 0.82;
          }
          await Incident.updateOne({ id: incidentId }, { $set: updates });
          await eventService.appendEvent({
            incidentId,
            type: 'success',
            message: `Phase advanced to ${next}`,
            phase: next,
          });
        }
      }
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

export async function breakIt(
  profileId: string,
  input: {
  service: string;
  alertType: string;
}): Promise<Omit<IncidentAttrs, 'profileId'>> {
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

  const id = createIncidentId(input.service);
  const startedAt = new Date().toISOString();

  const incident = await Incident.create({
    id,
    profileId,
    service: input.service,
    alertType: input.alertType,
    phase: 'alert',
    startedAt,
  });

  await eventService.appendEvent({
    incidentId: id,
    type: 'failure',
    tool: 'grafana',
    message: `Alert fired: ${input.alertType}`,
    detail: `Service ${input.service} breached SLO`,
    phase: 'alert',
  });

  await seedInitialTelemetry(id, true);

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
      `Production incident ${id} on service "${input.service}".`,
      `Alert: ${input.alertType}.`,
      'Investigate root cause using available tools.',
      'Propose a fix and pause for human approval before any mutating action.',
    ].join(' ');
    void consumeAgentStream(id, sessionId, prompt);
  }

  return toPublicIncident(incident.toObject());
}

export async function approveIncident(
  id: string,
  profileId: string,
  approvedBy: string,
): Promise<Omit<IncidentAttrs, 'profileId'>> {
  const incident = await getIncidentOrThrow(id, profileId);
  if (incident.phase !== 'awaiting_approval' && incident.phase !== 'pr_opened') {
    throw new AppError(
      `Incident ${id} is not awaiting approval (phase=${incident.phase})`,
      StatusCodes.CONFLICT,
    );
  }

  if (incident.trueforgeSessionId && incident.trueforgePendingApproval) {
    try {
      await trueforge.submitApproval(incident.trueforgeSessionId, {
        toolCallId: incident.trueforgePendingApproval.toolCallId,
        threadId: incident.trueforgePendingApproval.threadId,
        status: 'allow',
      });
    } catch (err) {
      logger.warn('TrueForge approval submit failed', err);
    }
  }

  let prUrl = incident.prUrl;
  let prNumber = incident.prNumber;
  let diff = incident.diff ?? incident.proposedPatch;

  // PR may already have been opened after sandbox verification — do not create a duplicate.
  if (prUrl) {
    await eventService.appendEvent({
      incidentId: id,
      type: 'info',
      tool: 'github',
      message: `Using existing PR #${prNumber ?? '?'}`,
      detail: prUrl,
      phase: 'pr_opened',
    });
  } else if (
    incident.proposedPatch &&
    incident.githubOwner &&
    incident.githubRepo
  ) {
    try {
      const pr = await github.createPullRequest(profileId, {
        owner: incident.githubOwner,
        repo: incident.githubRepo,
        title: `[Sentinel] Fix for ${incident.alertType} on ${incident.service}`,
        body: `Automated fix proposed by Sentinel for incident ${id}.\n\nRoot cause: ${incident.rootCause ?? 'See investigation logs'}`,
        patch: incident.proposedPatch,
      });
      prUrl = pr.prUrl;
      prNumber = pr.prNumber;
      diff = pr.diff;
      await eventService.appendEvent({
        incidentId: id,
        type: 'success',
        tool: 'github',
        message: `PR #${prNumber} opened`,
        detail: prUrl,
        phase: 'pr_opened',
      });
    } catch (err) {
      logger.error('Failed to create PR on approval', err);
      await eventService.appendEvent({
        incidentId: id,
        type: 'failure',
        tool: 'github',
        message: 'Failed to open PR — incident marked resolved with proposed patch only',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  let mergeMessage: string | undefined;
  if (
    prNumber != null &&
    incident.githubOwner &&
    incident.githubRepo
  ) {
    try {
      const merge = await github.mergePullRequest(profileId, {
        owner: incident.githubOwner,
        repo: incident.githubRepo,
        pullNumber: prNumber,
        commitTitle: `[Sentinel] Merge fix for ${incident.alertType} on ${incident.service}`,
      });
      mergeMessage = merge.message;
      await eventService.appendEvent({
        incidentId: id,
        type: 'success',
        tool: 'github',
        message: merge.merged
          ? `PR #${prNumber} merged`
          : `PR #${prNumber} merge attempted: ${merge.message}`,
        ...(merge.sha || prUrl
          ? { detail: merge.sha ?? prUrl }
          : {}),
        phase: 'resolved',
      });
    } catch (err) {
      logger.error('Failed to merge PR on approval', err);
      await eventService.appendEvent({
        incidentId: id,
        type: 'failure',
        tool: 'github',
        message: `Failed to merge PR #${prNumber} — incident still marked resolved`,
        detail: err instanceof Error ? err.message : 'Unknown error',
        phase: 'resolved',
      });
    }
  }

  const approvedAt = new Date().toISOString();
  await Incident.updateOne(
    { id },
    {
      $set: {
        phase: 'resolved',
        approvedBy,
        approvedAt,
        resolvedAt: approvedAt,
        resolvedBy: 'human',
        ...(prUrl !== undefined ? { prUrl } : {}),
        ...(prNumber !== undefined ? { prNumber } : {}),
        ...(diff !== undefined ? { diff } : {}),
      },
      $unset: { trueforgePendingApproval: 1 },
    },
  );

  await eventService.appendEvent({
    incidentId: id,
    type: 'success',
    message: mergeMessage
      ? `Approved by ${approvedBy} — ${mergeMessage}`
      : prUrl
        ? `Approved by ${approvedBy} — remediation accepted (PR ${prUrl})`
        : `Approved by ${approvedBy} — remediation accepted`,
    phase: 'resolved',
  });

  return getIncident(id, profileId);
}

export async function rejectIncident(
  id: string,
  profileId: string,
  reason?: string,
): Promise<Omit<IncidentAttrs, 'profileId'>> {
  const incident = await getIncidentOrThrow(id, profileId);
  if (TERMINAL_PHASES.has(incident.phase)) {
    throw new AppError(`Incident ${id} is already terminal`, StatusCodes.CONFLICT);
  }

  if (incident.trueforgeSessionId && incident.trueforgePendingApproval) {
    try {
      await trueforge.submitApproval(incident.trueforgeSessionId, {
        toolCallId: incident.trueforgePendingApproval.toolCallId,
        threadId: incident.trueforgePendingApproval.threadId,
        status: 'deny',
        ...(reason !== undefined ? { reason } : {}),
      });
    } catch (err) {
      logger.warn('TrueForge deny submit failed', err);
    }
  }

  await Incident.updateOne(
    { id },
    {
      $set: {
        phase: 'rejected',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'human',
      },
      $unset: { trueforgePendingApproval: 1 },
    },
  );

  await eventService.appendEvent({
    incidentId: id,
    type: 'failure',
    message: 'Proposed fix rejected',
    ...(reason !== undefined ? { detail: reason } : {}),
    phase: 'rejected',
  });

  return getIncident(id, profileId);
}

export async function retryIncident(
  id: string,
  profileId: string,
): Promise<Omit<IncidentAttrs, 'profileId'>> {
  const incident = await getIncidentOrThrow(id, profileId);
  if (!['rejected', 'investigating', 'awaiting_approval'].includes(incident.phase)) {
    throw new AppError(
      `Cannot retry incident in phase ${incident.phase}`,
      StatusCodes.CONFLICT,
    );
  }

  await Incident.updateOne(
    { id },
    {
      $set: { phase: 'investigating' },
      $unset: {
        trueforgePendingApproval: 1,
        resolvedAt: 1,
        resolvedBy: 1,
        approvedBy: 1,
        approvedAt: 1,
      },
    },
  );

  await eventService.appendEvent({
    incidentId: id,
    type: 'action',
    message: 'Retrying investigation with alternate path',
    phase: 'investigating',
  });

  let sessionId = incident.trueforgeSessionId;
  if (!sessionId) {
    try {
      const session = await trueforge.createSession({
        title: `Incident ${id} retry`,
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
      logger.warn('Retry session create failed', err);
    }
  }

  if (sessionId) {
    const prompt = `Retry investigation for incident ${id} on ${incident.service}. Prior path was insufficient. Find root cause and propose a safer fix.`;
    void consumeAgentStream(id, sessionId, prompt);
  }

  return getIncident(id, profileId);
}

export async function escalateIncident(
  id: string,
  profileId: string,
): Promise<Omit<IncidentAttrs, 'profileId'>> {
  await getIncidentOrThrow(id, profileId);
  await Incident.updateOne(
    { id },
    {
      $set: {
        phase: 'escalated',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'human',
      },
      $unset: { trueforgePendingApproval: 1 },
    },
  );
  await eventService.appendEvent({
    incidentId: id,
    type: 'action',
    message: 'Escalated to on-call',
    phase: 'escalated',
  });
  return getIncident(id, profileId);
}

export async function closeIncident(
  id: string,
  profileId: string,
): Promise<Omit<IncidentAttrs, 'profileId'>> {
  await getIncidentOrThrow(id, profileId);
  await Incident.updateOne(
    { id },
    {
      $set: {
        phase: 'rejected',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'human',
      },
      $unset: { trueforgePendingApproval: 1 },
    },
  );
  await eventService.appendEvent({
    incidentId: id,
    type: 'info',
    message: 'Incident closed without merge',
    phase: 'rejected',
  });
  return getIncident(id, profileId);
}

export async function getPostmortem(id: string, profileId: string) {
  const incident = await getIncident(id, profileId);
  const events = await eventService.listEvents(id, profileId);
  const startedAt = new Date(incident.startedAt).getTime();
  const resolvedAt = incident.resolvedAt
    ? new Date(incident.resolvedAt).getTime()
    : Date.now();
  const ttrMs = Math.max(0, resolvedAt - startedAt);

  const markdown = [
    `# Postmortem: ${id}`,
    '',
    `- **Service:** ${incident.service}`,
    `- **Alert:** ${incident.alertType}`,
    `- **Phase:** ${incident.phase}`,
    `- **TTR:** ${Math.round(ttrMs / 1000)}s`,
    incident.rootCause ? `- **Root cause:** ${incident.rootCause}` : null,
    incident.confidence !== undefined
      ? `- **Confidence:** ${Math.round(incident.confidence * 100)}%`
      : null,
    incident.prUrl ? `- **PR:** ${incident.prUrl}` : null,
    '',
    '## Timeline',
    ...events.map(
      (e) =>
        `- \`${e.timestamp}\` **${e.type}**${e.tool ? ` [${e.tool}]` : ''}: ${e.message}`,
    ),
  ]
    .filter(Boolean)
    .join('\n');

  return {
    incident,
    events,
    ttrMs,
    markdown,
  };
}
