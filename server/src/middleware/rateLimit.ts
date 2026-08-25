import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';

export const mutationRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
});
