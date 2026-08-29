import { Schema, model, type Model } from 'mongoose';

export type WebhookAttrs = {
  id: string;
  profileId: string;
  name: string;
  secretHash: string;
  githubOwner: string;
  githubRepo: string;
  serviceName: string;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
};

const webhookSchema = new Schema<WebhookAttrs>(
  {
    id: { type: String, required: true, unique: true, index: true },
    profileId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    secretHash: { type: String, required: true },
    githubOwner: { type: String, required: true },
    githubRepo: { type: String, required: true },
    serviceName: { type: String, required: true },
    enabled: { type: Boolean, required: true, default: true },
    createdAt: { type: String, required: true },
    lastTriggeredAt: { type: String },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

export const Webhook: Model<WebhookAttrs> = model<WebhookAttrs>(
  'Webhook',
  webhookSchema,
);
