import { Schema, model, type Model } from 'mongoose';

export type MetricPointAttrs = {
  incidentId: string | null;
  t: number;
  latencyMs: number;
  errorRate: number;
};

const metricPointSchema = new Schema<MetricPointAttrs>(
  {
    incidentId: { type: String, default: null, index: true },
    t: { type: Number, required: true },
    latencyMs: { type: Number, required: true },
    errorRate: { type: Number, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

metricPointSchema.index({ incidentId: 1, t: 1 });

export const MetricPoint: Model<MetricPointAttrs> = model<MetricPointAttrs>(
  'MetricPoint',
  metricPointSchema,
);
