import { StatusCodes } from 'http-status-codes';
import { AgentSession } from '../models/AgentSession';
import { Incident, type IncidentAttrs } from '../models/Incident';
import { AppError } from '../utils/AppError';

export async function registerAgentSession(input: {
  sessionId: string;
  profileId: string;
  incidentId?: string;
}): Promise<void> {
  if (input.incidentId) {
    const incident = await Incident.findOne({
      id: input.incidentId,
      profileId: input.profileId,
    }).lean();
    if (!incident) {
      throw new AppError(
        `Incident not found: ${input.incidentId}`,
        StatusCodes.NOT_FOUND,
      );
    }
  }

  await AgentSession.create({
    sessionId: input.sessionId,
    profileId: input.profileId,
    ...(input.incidentId !== undefined ? { incidentId: input.incidentId } : {}),
  });
}

export async function assertAgentSessionOwnership(
  sessionId: string,
  profileId: string,
): Promise<void> {
  const session = await AgentSession.findOne({ sessionId, profileId }).lean();
  if (!session) {
    throw new AppError('Agent session not found', StatusCodes.NOT_FOUND);
  }
}
