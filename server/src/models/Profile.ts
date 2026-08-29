import { Schema, model, type Model } from 'mongoose';

export type ProfileMode = 'demo' | 'real';

export type ProfileAttrs = {
  id: string;
  displayName: string;
  tokenHash: string;
  createdAt: string;
  mode?: ProfileMode;
  modeSelectedAt?: string;
};

const profileSchema = new Schema<ProfileAttrs>(
  {
    id: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    tokenHash: { type: String, required: true },
    createdAt: { type: String, required: true },
    mode: { type: String, enum: ['demo', 'real'] },
    modeSelectedAt: { type: String },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

export const Profile: Model<ProfileAttrs> = model<ProfileAttrs>(
  'Profile',
  profileSchema,
);
