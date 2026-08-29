import { Schema, model, type Model } from 'mongoose';
import {
  INCIDENT_PHASES,
  LOG_EVENT_TYPES,
  type IncidentPhase,
  type LogEventType,
} from '../types/domain';

export type LogEventAttrs = {
  id: string;
  incidentId: string;
  timestamp: string;
  type: LogEventType;
  tool?: string;
  message: string;
  detail?: string;
  phase?: IncidentPhase;
};

const logEventSchema = new Schema<LogEventAttrs>(
  {
    id: { type: String, required: true, unique: true, index: true },
    incidentId: { type: String, required: true, index: true },
    timestamp: { type: String, required: true },
    type: { type: String, enum: LOG_EVENT_TYPES, required: true },
    tool: { type: String },
    message: { type: String, required: true },
    detail: { type: String },
    phase: { type: String, enum: INCIDENT_PHASES },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

logEventSchema.index({ incidentId: 1, timestamp: 1, id: 1 });

export const LogEvent: Model<LogEventAttrs> = model<LogEventAttrs>(
  'LogEvent',
  logEventSchema,
);
