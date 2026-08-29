import { Schema, model, type Model } from 'mongoose';

export type ConnectorAttrs = {
  name: string;
  status: string;
  detail: string;
};

export type SandboxLimitsAttrs = {
  maxReplay: number;
  timeoutSec: number;
  isolation: string;
  network: string;
};

export type SettingsAttrs = {
  profileId: string;
  connectors: ConnectorAttrs[];
  modelApiKeyEncrypted?: string;
  githubTokenEncrypted?: string;
  githubConnectedAt?: string;
  githubUsername?: string;
  sandboxLimits: SandboxLimitsAttrs;
};

const settingsSchema = new Schema<SettingsAttrs>(
  {
    profileId: { type: String, required: true, unique: true, index: true },
    connectors: [
      {
        name: { type: String, required: true },
        status: { type: String, required: true },
        detail: { type: String, required: true },
      },
    ],
    modelApiKeyEncrypted: { type: String },
    githubTokenEncrypted: { type: String },
    githubConnectedAt: { type: String },
    githubUsername: { type: String },
    sandboxLimits: {
      maxReplay: { type: Number, required: true },
      timeoutSec: { type: Number, required: true },
      isolation: { type: String, required: true },
      network: { type: String, required: true },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Settings: Model<SettingsAttrs> = model<SettingsAttrs>(
  'Settings',
  settingsSchema,
);

export const DEFAULT_CONNECTORS: ConnectorAttrs[] = [
  {
    name: 'GitHub MCP',
    status: 'Connected',
    detail: 'PRs · reviews · merge',
  },
  {
    name: 'Sandbox',
    status: 'Connected',
    detail: 'Ephemeral clone · traffic replay',
  },
  {
    name: 'Metrics source',
    status: 'Connected',
    detail: 'Grafana · checkout-svc',
  },
];

export const DEFAULT_SANDBOX_LIMITS: SandboxLimitsAttrs = {
  maxReplay: 500,
  timeoutSec: 60,
  isolation: 'ephemeral clone',
  network: 'egress denied',
};
