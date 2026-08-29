export {};

declare global {
  namespace Express {
    interface Request {
      profileId?: string;
    }
  }
}
