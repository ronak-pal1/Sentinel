import { Schema, model, type Model } from 'mongoose';
import { INCIDENT_PHASES, type IncidentPhase } from '../types/domain';

export type QodoComment = {
  line: number;
  file: string;
  comment: string;
};

export type SandboxResult = {
  latencyMs: number;
  errorRate: number;
  requestsReplayed: number;
};

export type PendingApproval = {
  threadId: string;
  toolCallId: string;
};

export type IncidentAttrs = {
  id: string;
  profileId: string;
  service: string;
  alertType: string;
  phase: IncidentPhase;
  startedAt: string;
  source?: 'manual' | 'webhook' | 'demo';
  webhookId?: string;
  githubOwner?: string;
  githubRepo?: string;
  alertMessage?: string;
  daytonaSandboxId?: string;
  proposedPatch?: string;
  proposedBranch?: string;
  resolvedAt?: string;
  rootCause?: string;
  confidence?: number;
  sandboxResult?: SandboxResult;
  prUrl?: string;
  prNumber?: number;
  diff?: string;
  qodoComments?: QodoComment[];
  approvedBy?: string;
  approvedAt?: string;
  resolvedBy?: 'auto' | 'human';
  proposedAction?: string;
  trueforgeSessionId?: string;
  trueforgePendingApproval?: PendingApproval;
};

const incidentSchema = new Schema<IncidentAttrs>(
  {
    id: { type: String, required: true, unique: true, index: true },
    profileId: { type: String, required: true, index: true },
    service: { type: String, required: true },
    alertType: { type: String, required: true },
    phase: {
      type: String,
      enum: INCIDENT_PHASES,
      required: true,
      default: 'alert',
      index: true,
    },
    startedAt: { type: String, required: true },
    source: { type: String, enum: ['manual', 'webhook', 'demo'] },
    webhookId: { type: String },
    githubOwner: { type: String },
    githubRepo: { type: String },
    alertMessage: { type: String },
    daytonaSandboxId: { type: String },
    proposedPatch: { type: String },
    proposedBranch: { type: String },
    resolvedAt: { type: String },
    rootCause: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    sandboxResult: {
      latencyMs: { type: Number },
      errorRate: { type: Number },
      requestsReplayed: { type: Number },
    },
    prUrl: { type: String },
    prNumber: { type: Number },
    diff: { type: String },
    qodoComments: [
      {
        line: { type: Number },
        file: { type: String },
        comment: { type: String },
      },
    ],
    approvedBy: { type: String },
    approvedAt: { type: String },
    resolvedBy: { type: String, enum: ['auto', 'human'] },
    proposedAction: { type: String },
    trueforgeSessionId: { type: String },
    trueforgePendingApproval: {
      threadId: { type: String },
      toolCallId: { type: String },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Incident: Model<IncidentAttrs> = model<IncidentAttrs>(
  'Incident',
  incidentSchema,
);
