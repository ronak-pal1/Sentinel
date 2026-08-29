import { Schema, model, type Model } from 'mongoose';

export type AgentSessionAttrs = {
  sessionId: string;
  profileId: string;
  incidentId?: string;
};

const agentSessionSchema = new Schema<AgentSessionAttrs>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    profileId: { type: String, required: true, index: true },
    incidentId: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const AgentSession: Model<AgentSessionAttrs> = model<AgentSessionAttrs>(
  'AgentSession',
  agentSessionSchema,
);
