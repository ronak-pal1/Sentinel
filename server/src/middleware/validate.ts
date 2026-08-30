import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

function mergeValidated(
  target: Record<string, unknown>,
  parsed: Record<string, unknown>,
): void {
  for (const key of Object.keys(target)) {
    if (!(key in parsed)) {
      delete target[key];
    }
  }
  Object.assign(target, parsed);
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        mergeValidated(
          req.params as Record<string, unknown>,
          schemas.params.parse(req.params) as Record<string, unknown>,
        );
      }
      if (schemas.query) {
        mergeValidated(
          req.query as Record<string, unknown>,
          schemas.query.parse(req.query) as Record<string, unknown>,
        );
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as { issues: { path: (string | number)[]; message: string }[] })
          .issues;
        const message = issues
          .map((i) => `${i.path.join('.') || 'value'}: ${i.message}`)
          .join('; ');
        next(new AppError(message || 'Validation failed', StatusCodes.BAD_REQUEST));
        return;
      }
      next(err);
    }
  };
}
