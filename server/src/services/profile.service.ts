import { randomBytes } from 'crypto';
import { StatusCodes } from 'http-status-codes';
import { Profile, type ProfileAttrs, type ProfileMode } from '../models/Profile';
import { AppError } from '../utils/AppError';
import { hashToken, verifyTokenHash } from '../utils/crypto';
import { createProfileId } from '../utils/ids';

export type PublicProfile = {
  id: string;
  displayName: string;
  createdAt: string;
  mode: ProfileMode | null;
};

export type CreatedProfile = PublicProfile & {
  token: string;
  mode: ProfileMode | null;
};

function toPublicProfile(profile: ProfileAttrs): PublicProfile {
  return {
    id: profile.id,
    displayName: profile.displayName,
    createdAt: profile.createdAt,
    mode: profile.mode ?? null,
  };
}

export async function createProfile(displayName: string): Promise<CreatedProfile> {
  const id = createProfileId();
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const createdAt = new Date().toISOString();

  await Profile.create({
    id,
    displayName,
    tokenHash,
    createdAt,
  });

  return { id, displayName, createdAt, token, mode: null };
}

export async function verifyProfile(
  id: string,
  token: string,
): Promise<ProfileAttrs> {
  const profile = await Profile.findOne({ id }).lean<ProfileAttrs>();
  if (!profile || !verifyTokenHash(token, profile.tokenHash)) {
    throw new AppError('Invalid profile credentials', StatusCodes.UNAUTHORIZED);
  }
  return profile;
}

export async function getProfileById(id: string): Promise<PublicProfile> {
  const profile = await Profile.findOne({ id }).lean<ProfileAttrs>();
  if (!profile) {
    throw new AppError('Profile not found', StatusCodes.NOT_FOUND);
  }
  return toPublicProfile(profile);
}

export async function setProfileMode(
  id: string,
  mode: ProfileMode,
): Promise<PublicProfile> {
  const modeSelectedAt = new Date().toISOString();
  const profile = await Profile.findOneAndUpdate(
    { id },
    { $set: { mode, modeSelectedAt } },
    { new: true },
  ).lean<ProfileAttrs>();
  if (!profile) {
    throw new AppError('Profile not found', StatusCodes.NOT_FOUND);
  }
  return toPublicProfile(profile);
}

export async function getProfileMode(id: string): Promise<ProfileMode | null> {
  const profile = await Profile.findOne({ id }).lean<ProfileAttrs>();
  if (!profile) {
    throw new AppError('Profile not found', StatusCodes.NOT_FOUND);
  }
  return profile.mode ?? null;
}
